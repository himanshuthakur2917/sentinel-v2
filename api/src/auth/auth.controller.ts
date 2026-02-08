import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService, AuthTokens } from './auth.service';
import {
  RegisterDto,
  VerifyOtpDto,
  OnboardingDto,
  RefreshTokenDto,
} from './dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import type { JwtPayload } from './interfaces/jwt-payload.interface';
import { AuditLog } from '../audit';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /auth/register
   * Initiate registration by sending OTPs to email and phone
   */
  @Post('register')
  @AuditLog({ action: 'REGISTER_INITIATE', resource: 'auth', persist: true })
  async register(@Body() dto: RegisterDto): Promise<{ sessionToken: string }> {
    return this.authService.register(dto);
  }

  /**
   * POST /auth/verify-otp
   * Verify a single OTP (email or phone)
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
   */
  @Post('onboarding')
  @AuditLog({ action: 'ONBOARDING_COMPLETE', resource: 'auth', persist: true })
  async onboarding(@Body() dto: OnboardingDto): Promise<AuthTokens> {
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
