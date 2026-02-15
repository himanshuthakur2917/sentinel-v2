import {
  Injectable,
  Inject,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import Redis from 'ioredis';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import { SupabaseService } from '../database';
import { AuditService } from '../audit';
import { OtpService } from '../otp';
import { TokenService } from '../redis';
import { REDIS_CLIENT } from '../redis/constants';
import { RegisterDto, OnboardingDto, LoginDto } from './dto';
import { hashPassword, verifyPassword } from './utils/password.util';
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
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  /**
   * Step 1: Initiate registration - CREATE USER IMMEDIATELY with verified=false
   * Then send OTP to both email and phone for verification
   */
  async register(dto: RegisterDto): Promise<{
    sessionToken: string;
    userId: string;
    expiresAt: string;
  }> {
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

    // Hash password
    const passwordHash = await hashPassword(password);

    // ✅ CREATE USER IMMEDIATELY with verified flags as FALSE
    const { data: user, error } = await client
      .from('users')
      .insert({
        email,
        phone_number: phone,
        password_hash: passwordHash,
        email_verified: false,
        phone_verified: false,
        user_type: 'student', // Default valid type required by constraint
        onboarding_completed: false,
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      this.auditService.error(
        'Failed to create user during registration',
        'AuthService',
        {
          error: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        },
      );
      throw new BadRequestException(
        `Failed to create user: ${error.message} (code: ${error.code})`,
      );
    }

    // Send dual OTP with userId
    const { sessionToken, expiresAt } = await this.otpService.sendDualOtp(
      email,
      phone,
      user.id,
    );

    this.auditService.info(
      `User ${user.id} created (unverified) and OTPs sent`,
      'AuthService',
    );
    return { sessionToken, userId: user.id, expiresAt };
  }

  /**
   * Initiate login - validate password then check verification status
   */
  async login(dto: LoginDto): Promise<{
    sessionToken?: string;
    identifier?: string;
    type?: 'email' | 'phone';
    expiresAt?: string;
    requiresVerification?: boolean;
    userId?: string;
    emailVerified?: boolean;
    phoneVerified?: boolean;
    email?: string;
    phone?: string;
  }> {
    const { email, phone, password } = dto;

    if (!email && !phone) {
      throw new BadRequestException('Email or phone is required');
    }

    const identifier = email || phone!;
    const identifierType: 'email' | 'phone' = email ? 'email' : 'phone';

    // Find user by email or phone - include verification status
    const client = this.supabaseService.getClient();
    const query = email
      ? client
          .from('users')
          .select(
            'id, email, phone_number, email_verified, phone_verified, password_hash, failed_login_attempts, account_locked_until',
          )
          .eq('email', email)
      : client
          .from('users')
          .select(
            'id, email, phone_number, email_verified, phone_verified, password_hash, failed_login_attempts, account_locked_until',
          )
          .eq('phone_number', phone);

    const { data: user, error } = await query.single();

    if (error || !user) {
      throw new BadRequestException('User not found');
    }

    // Check if account is locked
    if (
      user.account_locked_until &&
      new Date(user.account_locked_until) > new Date()
    ) {
      const remainingMinutes = Math.ceil(
        (new Date(user.account_locked_until).getTime() - Date.now()) / 60000,
      );
      throw new UnauthorizedException(
        `Account is locked. Try again in ${remainingMinutes} minute(s)`,
      );
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
      // Track failed attempt
      const newFailedAttempts = (user.failed_login_attempts || 0) + 1;
      const updateData: any = {
        failed_login_attempts: newFailedAttempts,
        last_failed_login: new Date().toISOString(),
      };

      // Lock account after 5 failed attempts (15 min lockout)
      if (newFailedAttempts >= 5) {
        updateData.account_locked_until = new Date(
          Date.now() + 15 * 60 * 1000,
        ).toISOString();

        await client.from('users').update(updateData).eq('id', user.id);

        this.auditService.error(
          `Account locked for ${identifier} after 5 failed attempts`,
          'AuthService',
        );
        throw new UnauthorizedException(
          'Account locked due to too many failed attempts. Try again in 15 minutes.',
        );
      }

      await client.from('users').update(updateData).eq('id', user.id);

      this.auditService.warn(
        `Failed login attempt ${newFailedAttempts}/5 for ${identifier}`,
        'AuthService',
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    // Clear failed attempts on successful password verification
    if (user.failed_login_attempts > 0) {
      await client
        .from('users')
        .update({
          failed_login_attempts: 0,
          last_failed_login: null,
          account_locked_until: null,
        })
        .eq('id', user.id);
    }

    // ✅ CHECK VERIFICATION STATUS - 2FA requirement
    if (!user.email_verified || !user.phone_verified) {
      this.auditService.warn(
        `Login blocked for unverified user ${user.id}`,
        'AuthService',
      );

      // Send dual OTP to re-verify or complete verification
      // This ensures OTPs are logged in dev environment and session is created
      const { sessionToken, expiresAt } = await this.otpService.sendDualOtp(
        user.email,
        user.phone_number,
        user.id,
      );

      return {
        requiresVerification: true,
        userId: user.id,
        sessionToken, // Return session token for frontend
        emailVerified: user.email_verified,
        phoneVerified: user.phone_verified,
        email: user.email,
        phone: user.phone_number,
        expiresAt,
      };
    }

    // If fully verified, proceed with login OTP
    // TTL will use default from OTP service config (env: OTP_EXPIRY_SECONDS)
    const { sessionToken, expiresAt } = await this.otpService.sendLoginOtp(
      identifier,
      identifierType,
    );

    this.auditService.info(
      `Login initiated for ${identifier} (password verified)`,
      'AuthService',
    );
    return { sessionToken, identifier, type: identifierType, expiresAt };
  }

  /**
   * Step 2: Verify OTP - UPDATE DATABASE with verified status
   */
  async verifyOtp(
    sessionToken: string,
    identifier: string,
    identifierType: 'email' | 'phone',
    code: string,
  ): Promise<{ verified: boolean; fullyVerified: boolean; userId: string }> {
    const verified = await this.otpService.verifyCode(
      sessionToken,
      identifier,
      identifierType,
      code,
    );

    if (!verified) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    // Get session to extract userId
    const sessionData = await this.otpService.getSessionData(sessionToken);
    if (!sessionData || !sessionData.userId) {
      throw new UnauthorizedException('Invalid session');
    }

    const userId = sessionData.userId;

    // ✅ UPDATE users table with verified status
    const client = this.supabaseService.getClient();
    if (identifierType === 'email') {
      await client
        .from('users')
        .update({ email_verified: true })
        .eq('id', userId);
    } else {
      await client
        .from('users')
        .update({ phone_verified: true })
        .eq('id', userId);
    }

    // Check if both are now verified
    const { data: user } = await client
      .from('users')
      .select('email_verified, phone_verified')
      .eq('id', userId)
      .single();

    const fullyVerified = user?.email_verified && user?.phone_verified;

    this.auditService.success(
      `${identifierType} verified for user ${userId}`,
      'AuthService',
    );

    return { verified: true, fullyVerified: !!fullyVerified, userId };
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
            .select('id, email, phone_number, user_type, onboarding_completed')
            .eq('email', identifier)
        : client
            .from('users')
            .select('id, email, phone_number, user_type, onboarding_completed')
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
   * Complete login after verification (for users who needed to verify during login)
   */
  async completeLoginAfterVerification(userId: string): Promise<AuthTokens> {
    const client = this.supabaseService.getClient();

    // Verify user is fully verified
    const { data: user, error } = await client
      .from('users')
      .select(
        'id, email, phone_number, user_type, email_verified, phone_verified, onboarding_completed',
      )
      .eq('id', userId)
      .single();

    if (error || !user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.email_verified || !user.phone_verified) {
      throw new UnauthorizedException('Verification incomplete');
    }

    // Update last login
    await client
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', userId);

    // Generate tokens
    const tokens = this.generateTokens(user);

    // Store refresh token
    const decoded = this.jwtService.decode(tokens.refreshToken) as {
      jti: string;
    };
    await this.tokenService.storeRefreshToken(
      userId,
      decoded.jti,
      REFRESH_TOKEN_TTL,
    );

    this.auditService.success(
      `User ${userId} logged in after verification`,
      'AuthService',
    );
    return tokens;
  }

  /**
   * Step 3: Complete onboarding - UPDATE user with profile details
   * User already exists from registration
   */
  async completeOnboarding(dto: OnboardingDto): Promise<AuthTokens> {
    const {
      sessionToken,
      fullName,
      userName,
      userType,
      country,
      timezone,
      theme,
      language,
    } = dto;

    // Get session to extract userId
    const sessionData = await this.otpService.getSessionData(sessionToken);
    if (!sessionData || !sessionData.userId) {
      throw new UnauthorizedException('Invalid session');
    }

    const userId = sessionData.userId;

    // Verify both email and phone are verified
    const client = this.supabaseService.getClient();
    const { data: user, error: fetchError } = await client
      .from('users')
      .select(
        'id, email, phone_number, user_type, email_verified, phone_verified',
      )
      .eq('id', userId)
      .single();

    if (fetchError || !user) {
      throw new BadRequestException('User not found');
    }

    if (!user.email_verified || !user.phone_verified) {
      throw new UnauthorizedException(
        'Both email and phone must be verified before onboarding',
      );
    }

    // ✅ UPDATE user with onboarding details (don't create)
    const { error: updateError } = await client
      .from('users')
      .update({
        full_name: fullName,
        user_name: userName,
        user_type: userType,
        user_role: userType === 'team_manager' ? 'team_manager' : 'individual',
        country,
        timezone,
        theme: theme || 'system',
        language: language || 'en',
        onboarding_completed: true,
        last_login_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (updateError) {
      this.auditService.error(
        'Failed to update user during onboarding',
        'AuthService',
        {
          error: updateError.message,
        },
      );
      throw new BadRequestException('Failed to complete onboarding');
    }

    // Generate tokens
    const tokens = this.generateTokens({
      id: userId,
      email: user.email,
      phone_number: user.phone_number,
      user_type: userType,
    });

    // Store refresh token in Redis
    const decoded = this.jwtService.decode(tokens.refreshToken) as {
      jti: string;
    };
    await this.tokenService.storeRefreshToken(
      userId,
      decoded.jti,
      REFRESH_TOKEN_TTL,
    );

    // Clean up verification session
    await this.otpService.cleanupSession(sessionToken);

    this.auditService.success(
      `User ${userId} completed onboarding`,
      'AuthService',
    );
    return tokens;
  }

  /**
   * Update user profile (for authenticated users completing onboarding after login)
   * Uses JWT authentication instead of session token
   */
  async updateProfile(
    userId: string,
    data: {
      fullName: string;
      userName: string;
      userType: 'student' | 'working_professional' | 'team_manager';
      country: string;
      timezone: string;
      theme?: 'light' | 'dark' | 'system';
      language?: 'en' | 'hi';
    },
  ): Promise<AuthTokens> {
    const { userName, userType, country, timezone, theme, language } = data;

    const client = this.supabaseService.getClient();

    // Get current user data
    const { data: user, error: fetchError } = await client
      .from('users')
      .select('id, email, phone_number, user_type')
      .eq('id', userId)
      .single();

    if (fetchError || !user) {
      throw new BadRequestException('User not found');
    }

    // Update user with profile details
    const { error: updateError } = await client
      .from('users')
      .update({
        full_name: data.fullName,
        user_name: userName,
        user_type: userType,
        user_role: userType === 'team_manager' ? 'team_manager' : 'individual',
        country,
        timezone,
        theme: theme || 'system',
        language: language || 'en',
        onboarding_completed: true,
        last_login_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (updateError) {
      this.auditService.error('Failed to update user profile', 'AuthService', {
        error: updateError.message,
      });
      throw new BadRequestException('Failed to update profile');
    }

    // Generate new tokens with updated onboarding status
    const tokens = this.generateTokens({
      id: userId,
      email: user.email,
      phone_number: user.phone_number,
      user_type: userType,
      onboarding_completed: true,
    });

    // Store refresh token in Redis
    const decoded = this.jwtService.decode(tokens.refreshToken) as {
      jti: string;
    };
    await this.tokenService.storeRefreshToken(
      userId,
      decoded.jti,
      REFRESH_TOKEN_TTL,
    );

    this.auditService.success(
      `User ${userId} updated profile and completed onboarding`,
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
      .select('id, email, phone_number, user_type, onboarding_completed')
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
    onboarding_completed?: boolean;
  }): AuthTokens {
    const tokenId = randomUUID();

    const payload = {
      sub: user.id,
      email: user.email,
      phone: user.phone_number,
      userType: user.user_type as JwtPayload['userType'],
      onboardingCompleted: user.onboarding_completed ?? false,
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

  /**
   * Resend OTP during registration verification
   */
  async resendRegistrationOtp(
    sessionToken: string,
    identifierType: 'email' | 'phone',
    identifier: string,
  ): Promise<{ success: boolean; expiresAt: string }> {
    return this.otpService.resendOtp(sessionToken, identifierType, identifier);
  }

  /**
   * Resend OTP during login verification
   */
  async resendLoginOtp(
    sessionToken: string,
    identifierType: 'email' | 'phone',
    identifier: string,
  ): Promise<{ success: boolean; expiresAt: string }> {
    return this.otpService.resendOtp(sessionToken, identifierType, identifier);
  }

  /**
   * Get current user info with Redis caching
   */
  async getMe(userId: string): Promise<any> {
    // 1. Check Redis cache
    const cacheKey = `user:profile:${userId}`;
    try {
      const cachedUser = await this.redis.get(cacheKey);

      if (cachedUser) {
        this.auditService.debug(
          `User profile cache hit for ${userId}`,
          'AuthService',
        );
        return JSON.parse(cachedUser);
      }
    } catch (error) {
      this.auditService.warn(
        `Redis cache fetch failed for ${userId}: ${error.message}`,
        'AuthService',
      );
      // Continue to fetch from DB
    }

    // 2. Fetch from DB
    const client = this.supabaseService.getClient();
    const { data: user, error } = await client
      .from('users')
      .select(
        'id, email, full_name, user_name, profile_picture_url, user_type, onboarding_completed, country, timezone',
      )
      .eq('id', userId)
      .single();

    if (error || !user) {
      throw new BadRequestException('User not found');
    }

    // 3. Store in Redis (1 hour TTL)
    try {
      await this.redis.setex(cacheKey, 60 * 60, JSON.stringify(user));
    } catch (error) {
      this.auditService.warn(
        `Redis cache store failed for ${userId}: ${error.message}`,
        'AuthService',
      );
    }

    return user;
  }

  // TODO: Implement forgot password flow
  // TODO: Implement rate limiting for failed login attempts
  /**
   * Check if username is available
   */
  async checkUsernameAvailability(username: string): Promise<boolean> {
    const client = this.supabaseService.getClient();
    const { data, error } = await client
      .from('users')
      .select('id')
      .eq('user_name', username)
      .single();

    // If we find a user, the username is NOT available (return false)
    // If we don't find a user (error or null data), it IS available (return true)
    return !data;
  }
}
