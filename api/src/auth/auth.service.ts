import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import { SupabaseService } from '../database';
import { AuditService } from '../audit';
import { OtpService } from '../otp';
import { TokenService } from '../redis';
import { RegisterDto, OnboardingDto, LoginDto } from './dto';
import { hashPassword, verifyPassword } from './utils/password.util';
import type { JwtPayload } from './interfaces/jwt-payload.interface';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60; // 7 days in seconds
const ACCESS_TOKEN_TTL = 15 * 60; // 15 minutes in seconds
const OTP_SESSION_TTL = 90; // 90 seconds after password verification

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly supabaseService: SupabaseService,
    private readonly auditService: AuditService,
    private readonly otpService: OtpService,
    private readonly tokenService: TokenService,
  ) {}

  /**
   * Step 1: Initiate registration - validate & send OTP to both email and phone
   * Password is stored after OTP verification in completeOnboarding
   */
  async register(
    dto: RegisterDto,
  ): Promise<{ sessionToken: string; passwordHash: string }> {
    const { email, phone, password } = dto;

    // Check if user already exists
    const client = this.supabaseService.getClient();
    const { data: existingUser } = await client
      .from('users')
      .select('id')
      .or(`email.eq.${email},phone_number.eq.${phone}`)
      .single();

    if (existingUser) {
      throw new BadRequestException(
        'User with this email or phone already exists',
      );
    }

    // Hash password for later storage
    const passwordHash = await hashPassword(password);

    // Send dual OTP
    const sessionToken = await this.otpService.sendDualOtp(email, phone);

    this.auditService.info(
      `Registration initiated for ${email}`,
      'AuthService',
    );
    return { sessionToken, passwordHash };
  }

  /**
   * Initiate login - validate password then send OTP to the identifier used
   */
  async login(dto: LoginDto): Promise<{
    sessionToken: string;
    identifier: string;
    type: 'email' | 'phone';
  }> {
    const { email, phone, password } = dto;

    if (!email && !phone) {
      throw new BadRequestException('Email or phone is required');
    }

    const identifier = email || phone!;
    const identifierType: 'email' | 'phone' = email ? 'email' : 'phone';

    // Find user by email or phone
    const client = this.supabaseService.getClient();
    const query = email
      ? client
          .from('users')
          .select('id, email, phone_number, password_hash')
          .eq('email', email)
      : client
          .from('users')
          .select('id, email, phone_number, password_hash')
          .eq('phone_number', phone);

    const { data: user, error } = await query.single();

    if (error || !user) {
      throw new BadRequestException('User not found');
    }

    // Check if user has a password set
    if (!user.password_hash) {
      throw new BadRequestException(
        'Password not set. Please use forgot password to set one.',
      );
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      // TODO: Implement rate limiting for failed attempts
      this.auditService.warn(
        `Failed login attempt for ${identifier}`,
        'AuthService',
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    // Send login OTP to the same identifier type used
    const sessionToken = await this.otpService.sendLoginOtp(
      identifier,
      identifierType,
      OTP_SESSION_TTL,
    );

    this.auditService.info(
      `Login initiated for ${identifier} (password verified)`,
      'AuthService',
    );
    return { sessionToken, identifier, type: identifierType };
  }

  /**
   * Step 2: Verify OTP (called twice for registration - once for email, once for phone)
   */
  async verifyOtp(
    sessionToken: string,
    identifier: string,
    identifierType: 'email' | 'phone',
    code: string,
  ): Promise<{ verified: boolean; fullyVerified: boolean }> {
    const verified = await this.otpService.verifyCode(
      sessionToken,
      identifier,
      identifierType,
      code,
    );

    if (!verified) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    // Check if both are verified
    const session = await this.otpService.isSessionFullyVerified(sessionToken);
    const fullyVerified = session?.emailVerified && session?.phoneVerified;

    return { verified: true, fullyVerified: !!fullyVerified };
  }

  /**
   * Verify login OTP and generate tokens
   */
  async verifyLogin(
    sessionToken: string,
    identifier: string,
    identifierType: 'email' | 'phone',
    code: string,
  ): Promise<AuthTokens> {
    // Verify the OTP
    const verified = await this.otpService.verifyCode(
      sessionToken,
      identifier,
      identifierType,
      code,
    );

    if (!verified) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    // Double check verification status
    const isVerified = await this.otpService.isLoginVerified(
      sessionToken,
      identifierType,
    );

    if (!isVerified) {
      throw new UnauthorizedException('OTP not verified');
    }

    // Get user by identifier
    const client = this.supabaseService.getClient();
    const query =
      identifierType === 'email'
        ? client
            .from('users')
            .select('id, email, phone_number, user_type')
            .eq('email', identifier)
        : client
            .from('users')
            .select('id, email, phone_number, user_type')
            .eq('phone_number', identifier);

    const { data: user, error } = await query.single();

    if (error || !user) {
      throw new UnauthorizedException('User not found');
    }

    // Clean up session
    await this.otpService.cleanupSession(sessionToken);

    // Update last login
    await client
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', user.id);

    // Generate tokens
    const tokens = this.generateTokens(
      user as {
        id: string;
        email: string;
        phone_number: string;
        user_type: string;
      },
    );

    // Store refresh token
    const decoded = this.jwtService.decode(tokens.refreshToken) as {
      jti: string;
    };
    await this.tokenService.storeRefreshToken(
      user.id,
      decoded.jti,
      REFRESH_TOKEN_TTL,
    );

    this.auditService.success(
      `User ${user.id} logged in via OTP`,
      'AuthService',
    );
    return tokens;
  }

  /**
   * Step 3: Complete onboarding after both OTPs verified (includes password storage)
   */
  async completeOnboarding(
    dto: OnboardingDto & { passwordHash: string },
  ): Promise<AuthTokens> {
    const {
      sessionToken,
      userName,
      userType,
      country,
      timezone,
      theme,
      language,
      passwordHash,
    } = dto;

    // Verify session is fully verified
    const session = await this.otpService.isSessionFullyVerified(sessionToken);
    if (!session || !session.emailVerified || !session.phoneVerified) {
      throw new UnauthorizedException(
        'Both email and phone must be verified first',
      );
    }

    const client = this.supabaseService.getClient();

    // Create user with password hash
    const { data: user, error } = await client
      .from('users')
      .insert({
        email: session.email,
        phone_number: session.phone,
        user_name: userName,
        user_type: userType,
        user_role: userType === 'team_manager' ? 'team_manager' : 'individual',
        country,
        timezone,
        theme: theme || 'system',
        language: language || 'en',
        email_verified: true,
        phone_verified: true,
        onboarding_completed: true,
        last_login_at: new Date().toISOString(),
        password_hash: passwordHash,
      })
      .select()
      .single();

    if (error) {
      this.auditService.error('Failed to create user', 'AuthService', {
        error: error.message,
      });
      throw new BadRequestException('Failed to create user');
    }

    // Clean up verification session
    await this.otpService.cleanupSession(sessionToken);

    // Generate tokens
    const tokens = this.generateTokens(
      user as {
        id: string;
        email: string;
        phone_number: string;
        user_type: string;
      },
    );

    // Store refresh token in Redis
    const decoded = this.jwtService.decode(tokens.refreshToken) as {
      jti: string;
    };
    await this.tokenService.storeRefreshToken(
      (user as { id: string }).id,
      decoded.jti,
      REFRESH_TOKEN_TTL,
    );

    this.auditService.success(
      `User ${(user as { id: string }).id} created and logged in`,
      'AuthService',
    );
    return tokens;
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    // Decode the refresh token to get user info
    let decoded: JwtPayload & { jti: string };
    try {
      decoded = this.jwtService.verify(refreshToken) as JwtPayload & {
        jti: string;
      };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (!decoded.jti) {
      throw new UnauthorizedException('Invalid refresh token format');
    }

    // Check if token is valid in Redis
    const isValid = await this.tokenService.isRefreshTokenValid(
      decoded.sub,
      decoded.jti,
    );
    if (!isValid) {
      throw new UnauthorizedException('Refresh token expired or revoked');
    }

    // Revoke old token
    await this.tokenService.revokeRefreshToken(decoded.sub, decoded.jti);

    // Get user data for new tokens
    const client = this.supabaseService.getClient();
    const { data: user, error } = await client
      .from('users')
      .select('id, email, phone_number, user_type')
      .eq('id', decoded.sub)
      .single();

    if (error || !user) {
      throw new UnauthorizedException('User not found');
    }

    // Generate new tokens
    const tokens = this.generateTokens(
      user as {
        id: string;
        email: string;
        phone_number: string;
        user_type: string;
      },
    );

    // Store new refresh token in Redis
    const newDecoded = this.jwtService.decode(tokens.refreshToken) as {
      jti: string;
    };
    await this.tokenService.storeRefreshToken(
      decoded.sub,
      newDecoded.jti,
      REFRESH_TOKEN_TTL,
    );

    this.auditService.info(
      `Tokens refreshed for user ${decoded.sub}`,
      'AuthService',
    );
    return tokens;
  }

  /**
   * Generate access and refresh tokens (sync - no DB operations)
   */
  private generateTokens(user: {
    id: string;
    email: string;
    phone_number: string;
    user_type: string;
  }): AuthTokens {
    const tokenId = randomUUID();

    const payload = {
      sub: user.id,
      email: user.email,
      phone: user.phone_number,
      userType: user.user_type as JwtPayload['userType'],
      jti: tokenId,
    };

    // Access token (15 minutes)
    const accessToken = this.jwtService.sign(payload);

    // Refresh token (7 days)
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: REFRESH_TOKEN_TTL,
    });

    return { accessToken, refreshToken };
  }

  /**
   * Revoke all refresh tokens for a user (logout from all devices)
   */
  async revokeAllTokens(userId: string): Promise<void> {
    await this.tokenService.revokeAllUserTokens(userId);
    this.auditService.info(
      `All tokens revoked for user ${userId}`,
      'AuthService',
    );
  }

  /**
   * Blacklist an access token (for immediate invalidation)
   */
  async blacklistAccessToken(token: string): Promise<void> {
    try {
      const decoded = this.jwtService.verify(token) as JwtPayload & {
        jti: string;
      };
      if (decoded.jti) {
        await this.tokenService.blacklistAccessToken(
          decoded.jti,
          ACCESS_TOKEN_TTL,
        );
      }
    } catch {
      // Token already expired, no need to blacklist
    }
  }

  // TODO: Implement forgot password flow
  // TODO: Implement rate limiting for failed login attempts
}
