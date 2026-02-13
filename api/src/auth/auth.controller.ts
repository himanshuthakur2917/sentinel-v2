import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Res,
  BadRequestException,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthService, AuthTokens } from './auth.service';
import {
  RegisterDto,
  VerifyOtpDto,
  OnboardingDto,
  RefreshTokenDto,
  LoginDto,
  VerifyLoginDto,
  ResendOtpDto,
  UpdateProfileDto,
} from './dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import type { JwtPayload } from './interfaces/jwt-payload.interface';
import { AuditLog } from '../audit';

// Extended onboarding DTO that includes password hash from registration
interface OnboardingWithPasswordDto extends OnboardingDto {
  passwordHash: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /auth/register
   * Initiate registration by sending OTPs to email and phone
   * Returns.sessionToken and passwordHash for use in onboarding
   */
  @Post('register')
  @AuditLog({ action: 'REGISTER_INITIATE', resource: 'auth', persist: true })
  async register(
    @Body() dto: RegisterDto,
  ): Promise<{ sessionToken: string; userId: string; expiresAt: string }> {
    return this.authService.register(dto);
  }

  /**
   * POST /auth/login
   * Validate credentials and send OTP to email/phone
   * Returns.sessionToken, identifier used, and type
   */
  @Post('login')
  @AuditLog({ action: 'LOGIN_INITIATE', resource: 'auth', persist: true })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /**
   * POST /auth/login/verify
   * Verify login OTP and get tokens
   */
  @Post('login/verify')
  @HttpCode(HttpStatus.OK)
  @AuditLog({ action: 'LOGIN_VERIFY', resource: 'auth', persist: true })
  async verifyLogin(
    @Body() dto: VerifyLoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthTokens> {
    const identifier = dto.email || dto.phone!;
    const tokens = await this.authService.verifyLogin(
      dto.sessionToken,
      identifier,
      dto.identifierType,
      dto.code,
    );

    this.setAuthCookies(response, tokens);
    return tokens;
  }

  /**
   * POST /auth/verify-otp
   * Verify a single OTP (email or phone) during registration
   */
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @AuditLog({ action: 'OTP_VERIFY', resource: 'auth', persist: true })
  async verifyOtp(
    @Body() dto: VerifyOtpDto,
  ): Promise<{ verified: boolean; fullyVerified: boolean; userId: string }> {
    return this.authService.verifyOtp(
      dto.sessionToken,
      dto.identifier,
      dto.identifierType,
      dto.code,
    );
  }

  /**
   * POST /auth/onboarding
   * Complete user onboarding and create account
   */
  @Post('onboarding')
  @HttpCode(HttpStatus.OK)
  @AuditLog({ action: 'ONBOARDING_COMPLETE', resource: 'auth', persist: true })
  async completeOnboarding(
    @Body() dto: OnboardingDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthTokens> {
    const tokens = await this.authService.completeOnboarding(dto);
    this.setAuthCookies(response, tokens);
    return tokens;
  }

  /**
   * POST /auth/update-profile
   * Update user profile for authenticated users (completing onboarding after login)
   * Uses JWT authentication from cookies instead of session token
   */
  @Post('update-profile')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @AuditLog({ action: 'PROFILE_UPDATE', resource: 'auth', persist: true })
  async updateProfile(
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateProfileDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthTokens> {
    const tokens = await this.authService.updateProfile(userId, {
      fullName: dto.fullName,
      userName: dto.userName,
      userType: dto.userType,
      country: dto.country,
      timezone: dto.timezone,
      theme: dto.theme,
      language: dto.language,
    });
    this.setAuthCookies(response, tokens);
    return tokens;
  }

  /**
   * POST /auth/complete-login-after-verification
   * Auto-login after completing verification during login flow
   */
  @Post('complete-login-after-verification')
  @HttpCode(HttpStatus.OK)
  @AuditLog({
    action: 'LOGIN_AFTER_VERIFICATION',
    resource: 'auth',
    persist: true,
  })
  async completeLoginAfterVerification(
    @Body() body: { userId: string },
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthTokens> {
    const tokens = await this.authService.completeLoginAfterVerification(
      body.userId,
    );
    this.setAuthCookies(response, tokens);
    return tokens;
  }

  /**
   * POST /auth/refresh
   * Refresh access token using refresh token
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthTokens> {
    const tokens = await this.authService.refreshTokens(dto.refreshToken);
    this.setAuthCookies(response, tokens);
    return tokens;
  }

  /**
   * POST /auth/resend-registration-otp
   * Resend OTP during registration verification
   */
  @Post('resend-registration-otp')
  @HttpCode(HttpStatus.OK)
  @AuditLog({
    action: 'RESEND_REGISTRATION_OTP',
    resource: 'auth',
    persist: true,
  })
  async resendRegistrationOtp(
    @Body() dto: ResendOtpDto,
  ): Promise<{ success: boolean; expiresAt: string }> {
    return this.authService.resendRegistrationOtp(
      dto.sessionToken,
      dto.identifierType,
      dto.identifier,
    );
  }

  /**
   * POST /auth/resend-login-otp
   * Resend OTP during login verification
   */
  @Post('resend-login-otp')
  @HttpCode(HttpStatus.OK)
  @AuditLog({ action: 'RESEND_LOGIN_OTP', resource: 'auth', persist: true })
  async resendLoginOtp(
    @Body() dto: ResendOtpDto,
  ): Promise<{ success: boolean; expiresAt: string }> {
    return this.authService.resendLoginOtp(
      dto.sessionToken,
      dto.identifierType,
      dto.identifier,
    );
  }

  /**
   * POST /auth/logout
   * Revoke all refresh tokens (logout from all devices)
   */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @AuditLog({ action: 'LOGOUT', resource: 'auth', persist: true })
  async logout(
    @CurrentUser('sub') userId: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ message: string }> {
    await this.authService.revokeAllTokens(userId);

    // Clear cookies
    response.clearCookie('accessToken');
    response.clearCookie('refreshToken');
    response.clearCookie('token'); // Clear 'token' as well if we used it

    return { message: 'Logged out from all devices' };
  }

  /**
   * POST /auth/clear-cookies
   * Clear auth cookies without requiring authentication
   * Used to break redirect loops when client has invalid/expired cookies
   */
  @Post('clear-cookies')
  @HttpCode(HttpStatus.OK)
  async clearCookies(
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ message: string }> {
    response.clearCookie('accessToken');
    response.clearCookie('refreshToken');
    response.clearCookie('token');
    return { message: 'Cookies cleared' };
  }

  /**
   * GET /auth/me
   * Get current user info from JWT
   */
  @Post('me')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async me(@CurrentUser('sub') userId: string): Promise<any> {
    return this.authService.getMe(userId);
  }

  /**
   * GET /auth/check-username
   * Check if username is available
   */
  @Get('check-username')
  @HttpCode(HttpStatus.OK)
  async checkUsername(
    @Query('username') username: string,
  ): Promise<{ available: boolean }> {
    if (!username) {
      throw new BadRequestException('Username is required');
    }
    const available =
      await this.authService.checkUsernameAvailability(username);
    return { available };
  }

  // Helper to set cookies
  private setAuthCookies(response: Response, tokens: AuthTokens) {
    const isProd = process.env.NODE_ENV === 'production';

    // Access Token - typically 15 mins to 1 hour
    response.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 1000, // 1 hour
    });

    // Also set a 'token' cookie for compatibility if needed
    response.cookie('token', tokens.accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 1000, // 1 hour
    });

    // Refresh Token - longer lived (7 days)
    response.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }
}
