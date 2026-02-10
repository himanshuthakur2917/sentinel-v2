import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Session,
} from '@nestjs/common';
import { AuthService, AuthTokens } from './auth.service';
import {
  RegisterDto,
  VerifyOtpDto,
  OnboardingDto,
  RefreshTokenDto,
  LoginDto,
  VerifyLoginDto,
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
   * Returns sessionToken and passwordHash for use in onboarding
   */
  @Post('register')
  @AuditLog({ action: 'REGISTER_INITIATE', resource: 'auth', persist: true })
  async register(
    @Body() dto: RegisterDto,
  ): Promise<{ sessionToken: string; passwordHash: string }> {
    return this.authService.register(dto);
  }

  /**
   * POST /auth/login
   * Validate credentials and send OTP to email/phone
   * Returns sessionToken, identifier used, and type
   */
  @Post('login')
  @AuditLog({ action: 'LOGIN_INITIATE', resource: 'auth', persist: true })
  async login(
    @Body() dto: LoginDto,
  ): Promise<{
    sessionToken: string;
    identifier: string;
    type: 'email' | 'phone';
  }> {
    return this.authService.login(dto);
  }

  /**
   * POST /auth/login/verify
   * Verify login OTP and get tokens
   */
  @Post('login/verify')
  @HttpCode(HttpStatus.OK)
  @AuditLog({ action: 'LOGIN_VERIFY', resource: 'auth', persist: true })
  async verifyLogin(@Body() dto: VerifyLoginDto): Promise<AuthTokens> {
    const identifier = dto.email || dto.phone!;
    return this.authService.verifyLogin(
      dto.sessionToken,
      identifier,
      dto.identifierType,
      dto.code,
    );
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
  ): Promise<{ verified: boolean; fullyVerified: boolean }> {
    return this.authService.verifyOtp(
      dto.sessionToken,
      dto.identifier,
      dto.identifierType,
      dto.code,
    );
  }

  /**
   * POST /auth/onboarding
   * Complete user onboarding after both OTPs verified
   * Requires passwordHash from registration step
   */
  @Post('onboarding')
  @AuditLog({ action: 'ONBOARDING_COMPLETE', resource: 'auth', persist: true })
  async onboarding(
    @Body() dto: OnboardingWithPasswordDto,
  ): Promise<AuthTokens> {
    return this.authService.completeOnboarding(dto);
  }

  /**
   * POST /auth/refresh
   * Refresh access token using refresh token
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshTokenDto): Promise<AuthTokens> {
    return this.authService.refreshTokens(dto.refreshToken);
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
  ): Promise<{ message: string }> {
    await this.authService.revokeAllTokens(userId);
    return { message: 'Logged out from all devices' };
  }

  /**
   * GET /auth/me
   * Get current user info from JWT
   */
  @Post('me')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async me(@CurrentUser() user: JwtPayload): Promise<JwtPayload> {
    return user;
  }
}
