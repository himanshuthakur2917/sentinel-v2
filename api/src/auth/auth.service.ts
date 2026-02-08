import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { SupabaseService } from '../database';
import { AuditService } from '../audit';
import { OtpService } from '../otp';
import { RegisterDto, OnboardingDto } from './dto';
import type { JwtPayload } from './interfaces/jwt-payload.interface';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly supabaseService: SupabaseService,
    private readonly auditService: AuditService,
    private readonly otpService: OtpService,
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
    const tokens = await this.generateTokens(user);

    this.auditService.success(
      `User ${user.id} created and logged in`,
      'AuthService',
    );
    return tokens;
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    const client = this.supabaseService.getClient();

    // Hash the refresh token to compare with stored hash
    const tokenHash = await bcrypt.hash(refreshToken, 10);

    // Find the refresh token record
    const { data: tokenRecord, error } = await client
      .from('refresh_tokens')
      .select('*, users(*)')
      .eq('token_hash', tokenHash)
      .eq('revoked', false)
      .single();

    if (error || !tokenRecord) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Check if expired
    if (new Date(tokenRecord.expires_at) < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    // Revoke old token
    await client
      .from('refresh_tokens')
      .update({ revoked: true })
      .eq('id', tokenRecord.id);

    // Generate new tokens
    const tokens = await this.generateTokens(tokenRecord.users);

    this.auditService.info(
      `Tokens refreshed for user ${tokenRecord.user_id}`,
      'AuthService',
    );
    return tokens;
  }

  /**
   * Generate access and refresh tokens
   */
  private async generateTokens(user: {
    id: string;
    email: string;
    phone_number: string;
    user_type: string;
  }): Promise<AuthTokens> {
    const payload = {
      sub: user.id,
      email: user.email,
      phone: user.phone_number,
      userType: user.user_type as JwtPayload['userType'],
    };

    // Access token uses module default expiry (15m)
    const accessToken = this.jwtService.sign(payload);

    // Refresh token uses longer expiry (7 days = 604800 seconds)
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: 604800,
    });

    // Store refresh token hash
    const client = this.supabaseService.getClient();
    const tokenHash = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await client.from('refresh_tokens').insert({
      user_id: user.id,
      token_hash: tokenHash,
      expires_at: expiresAt.toISOString(),
    });

    return { accessToken, refreshToken };
  }

  /**
   * Revoke all refresh tokens for a user (logout from all devices)
   */
  async revokeAllTokens(userId: string): Promise<void> {
    const client = this.supabaseService.getClient();
    await client
      .from('refresh_tokens')
      .update({ revoked: true })
      .eq('user_id', userId);
    this.auditService.info(
      `All tokens revoked for user ${userId}`,
      'AuthService',
    );
  }
}
