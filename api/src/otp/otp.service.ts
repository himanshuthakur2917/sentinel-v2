import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuditService } from '../audit';
import { TokenService } from '../redis';
import { EmailProvider } from './providers/email.provider';
import { SmsProvider } from './providers/sms.provider';
import { randomBytes } from 'crypto';

export interface VerificationSession {
  sessionToken: string;
  email: string;
  phone: string;
  emailVerified: boolean;
  phoneVerified: boolean;
}

@Injectable()
export class OtpService {
  private readonly codeLength: number;
  private readonly expiryMinutes: number;
  private readonly maxAttempts: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
    private readonly tokenService: TokenService,
    private readonly emailProvider: EmailProvider,
    private readonly smsProvider: SmsProvider,
  ) {
    this.codeLength = this.configService.get<number>('otp.codeLength') || 6;
    this.expiryMinutes =
      this.configService.get<number>('otp.expiryMinutes') || 5;
    this.maxAttempts = this.configService.get<number>('otp.maxAttempts') || 3;
  }

  /**
   * Generate a random numeric OTP code
   */
  private generateCode(): string {
    const digits = '0123456789';
    let code = '';
    const bytes = randomBytes(this.codeLength);
    for (let i = 0; i < this.codeLength; i++) {
      code += digits[bytes[i] % 10];
    }
    return code;
  }

  /**
   * Generate a session token for linking email and phone verification
   */
  private generateSessionToken(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Send OTP to both email and phone, creating a verification session
   */
  async sendDualOtp(email: string, phone: string): Promise<string> {
    const sessionToken = this.generateSessionToken();
    const emailCode = this.generateCode();
    const phoneCode = this.generateCode();
    const ttlSeconds = this.expiryMinutes * 60;

    // Store both codes in Redis
    await Promise.all([
      this.tokenService.storeOtp(
        sessionToken,
        email,
        'email',
        emailCode,
        ttlSeconds,
      ),
      this.tokenService.storeOtp(
        sessionToken,
        phone,
        'phone',
        phoneCode,
        ttlSeconds,
      ),
    ]);

    // Send OTPs via providers
    await Promise.all([
      this.emailProvider.sendOtp(email, emailCode),
      this.smsProvider.sendOtp(phone, phoneCode),
    ]);

    this.auditService.success(
      `Dual OTP sent for session ${sessionToken.slice(0, 8)}...`,
      'OtpService',
    );

    return sessionToken;
  }

  /**
   * Verify a single OTP code (email or phone)
   */
  async verifyCode(
    sessionToken: string,
    identifier: string,
    identifierType: 'email' | 'phone',
    code: string,
  ): Promise<boolean> {
    // Get the OTP record from Redis
    const record = await this.tokenService.getOtp(sessionToken, identifierType);

    if (!record) {
      this.auditService.warn('Verification record not found', 'OtpService', {
        sessionToken: sessionToken.slice(0, 8),
        identifier,
      });
      return false;
    }

    // Check if already verified
    if (record.verified) {
      return true;
    }

    // Check if identifier matches
    if (record.identifier !== identifier) {
      this.auditService.warn('Identifier mismatch', 'OtpService', {
        identifier,
      });
      return false;
    }

    // Check if max attempts exceeded
    if (record.attempts >= this.maxAttempts) {
      this.auditService.warn('Max OTP attempts exceeded', 'OtpService', {
        identifier,
      });
      return false;
    }

    // Increment attempts
    await this.tokenService.incrementOtpAttempts(sessionToken, identifierType);

    // Verify code
    if (record.code !== code) {
      this.auditService.warn('Invalid OTP code', 'OtpService', { identifier });
      return false;
    }

    // Mark as verified
    await this.tokenService.markOtpVerified(sessionToken, identifierType);

    this.auditService.success(
      `${identifierType} verified for session`,
      'OtpService',
    );
    return true;
  }

  /**
   * Check if both email and phone are verified for a session
   */
  async isSessionFullyVerified(
    sessionToken: string,
  ): Promise<VerificationSession | null> {
    const session =
      await this.tokenService.isSessionFullyVerified(sessionToken);

    if (!session.email || !session.phone) {
      return null;
    }

    return {
      sessionToken,
      email: session.email.identifier,
      phone: session.phone.identifier,
      emailVerified: session.email.verified,
      phoneVerified: session.phone.verified,
    };
  }

  /**
   * Clean up verification records after successful auth
   */
  async cleanupSession(sessionToken: string): Promise<void> {
    await this.tokenService.deleteOtpSession(sessionToken);
  }
}
