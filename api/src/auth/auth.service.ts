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
import { RegisterDto, OnboardingDto } from './dto';
import type { JwtPayload } from './interfaces/jwt-payload.interface';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60; // 7 days in seconds
const ACCESS_TOKEN_TTL = 15 * 60; // 15 minutes in seconds

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
   * Step 1: Initiate registration by sending OTP to email and phone
   */
  async register(dto: RegisterDto): Promise<{ sessionToken: string }> {
    const { email, phone } = dto;

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

    // Send dual OTP
    const sessionToken = await this.otpService.sendDualOtp(email, phone);

    this.auditService.info(
      `Registration initiated for ${email}`,
      'AuthService',
    );
    return { sessionToken };
  }

  /**
   * Step 2: Verify OTP (called twice - once for email, once for phone)
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
   * Step 3: Complete onboarding after both OTPs verified
   */
  async completeOnboarding(dto: OnboardingDto): Promise<AuthTokens> {
    const {
      sessionToken,
      userName,
      userType,
      country,
      timezone,
      theme,
      language,
    } = dto;

    // Verify session is fully verified
    const session = await this.otpService.isSessionFullyVerified(sessionToken);
    if (!session || !session.emailVerified || !session.phoneVerified) {
      throw new UnauthorizedException(
        'Both email and phone must be verified first',
      );
    }

    const client = this.supabaseService.getClient();

    // Create user
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
}
