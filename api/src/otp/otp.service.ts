import { Injectable, UnauthorizedException } from '@nestjs/common';
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

export interface LoginVerificationSession {
  sessionToken: string;
  identifier: string;
  type: 'email' | 'phone';
  verified: boolean;
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
  async sendDualOtp(
    email: string,
    phone: string,
    userId: string, // NEW: link session to user
  ): Promise<{ sessionToken: string; expiresAt: string }> {
    const sessionToken = this.generateSessionToken();
    const emailCode = this.generateCode();
    const phoneCode = this.generateCode();
    const ttlSeconds = this.expiryMinutes * 60;
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();

    // Store session with userId in Redis
    await this.tokenService.client.set(
      `session:${sessionToken}`,
      JSON.stringify({
        userId, // NEW: store userId
        email,
        phone,
        emailVerified: false,
        phoneVerified: false,
        createdAt: new Date().toISOString(),
      }),
      'EX',
      ttlSeconds,
    );

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

    // Log OTP codes for development
    if (process.env.NODE_ENV === 'development') {
      console.log('\n🔐 OTP CODES (Development Only):');
      console.log(`📧 Email (${email}): ${emailCode}`);
      console.log(`📱 Phone (${phone}): ${phoneCode}`);
      console.log(`👤 User ID: ${userId}`);
      console.log(`🎫 Session: ${sessionToken.slice(0, 16)}...`);
      console.log(`⏱️  Expires: ${expiresAt}\n`);
    }

    this.auditService.success(`Dual OTP sent for user ${userId}`, 'OtpService');

    return { sessionToken, expiresAt };
  }

  /**
   * Send login OTP to a single identifier (email or phone)
   * @param identifier - Email or phone number
   * @param type - Type of identifier
   * @param customTtlSeconds - Optional custom TTL in seconds (default: expiryMinutes * 60)
   */
  async sendLoginOtp(
    identifier: string,
    type: 'email' | 'phone',
    customTtlSeconds?: number,
  ): Promise<{ sessionToken: string; expiresAt: string }> {
    const sessionToken = this.generateSessionToken();
    const code = this.generateCode();
    const ttlSeconds = customTtlSeconds ?? this.expiryMinutes * 60;
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();

    // Store code in Redis
    await this.tokenService.storeOtp(
      sessionToken,
      identifier,
      type,
      code,
      ttlSeconds,
    );

    // Send OTP via provider
    if (type === 'email') {
      await this.emailProvider.sendOtp(identifier, code);
    } else {
      await this.smsProvider.sendOtp(identifier, code);
    }

    // Log OTP code for development
    if (process.env.NODE_ENV === 'development') {
      const icon = type === 'email' ? '📧' : '📱';
      console.log('\n🔐 LOGIN OTP CODE (Development Only):');
      console.log(`${icon} ${type.toUpperCase()} (${identifier}): ${code}`);
      console.log(`🎫 Session: ${sessionToken.slice(0, 16)}...`);
      console.log(`⏱️  TTL: ${ttlSeconds}s`);
      console.log(`⏱️  Expires: ${expiresAt}\n`);
    }

    this.auditService.success(
      `Login OTP sent to ${identifier} (TTL: ${ttlSeconds}s) for session ${sessionToken.slice(
        0,
        8,
      )}...`,
      'OtpService',
    );

    return { sessionToken, expiresAt };
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
        sessionToken: sessionToken?.slice(0, 8),
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
   * Check if login OTP is verified for a session
   */
  async isLoginVerified(
    sessionToken: string,
    type: 'email' | 'phone',
  ): Promise<boolean> {
    const record = await this.tokenService.getOtp(sessionToken, type);
    return !!record?.verified;
  }

  /**
   * Resend OTP for a specific identifier in an existing session
   * @param sessionToken - Session token
   * @param identifierType - Type of identifier (email or phone)
   * @returns New expiry timestamp
   */
  async resendOtp(
    sessionToken: string,
    identifierType: 'email' | 'phone',
    identifier: string,
  ): Promise<{ success: boolean; expiresAt: string }> {
    // Get the existing session record to retrieve the identifier
    this.auditService.info('Resending OTP', 'OtpService', {
      sessionToken: sessionToken?.slice(0, 8),
      identifierType,
    });

    const code = this.generateCode();
    const ttlSeconds = this.expiryMinutes * 60;
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();

    await this.tokenService.storeOtp(
      sessionToken,
      identifier,
      identifierType,
      code,
      ttlSeconds,
    );

    // Send new OTP via provider
    if (identifierType === 'email') {
      await this.emailProvider.sendOtp(identifier, code);
    } else {
      await this.smsProvider.sendOtp(identifier, code);
    }

    // Log for development
    if (process.env.NODE_ENV === 'development') {
      const icon = identifierType === 'email' ? '📧' : '📱';
      console.log('\n🔄 RESEND OTP (Development Only):');
      console.log(
        `${icon} ${identifierType.toUpperCase()} (${identifier}): ${code}`,
      );
      console.log(`🎫 Session: ${sessionToken.slice(0, 16)}...`);
      console.log(`⏱️  Expires: ${expiresAt}\n`);
    }

    this.auditService.success(
      `OTP resent to ${identifier} for session ${sessionToken.slice(0, 8)}...`,
      'OtpService',
    );

    return { success: true, expiresAt };
  }

  /**
   * Get identifier from session
   */
  async getSessionIdentifier(
    sessionToken: string,
    type: 'email' | 'phone',
  ): Promise<string | null> {
    const record = await this.tokenService.getOtp(sessionToken, type);
    return record ? record.identifier : null;
  }

  /**
   * Clean up verification records after successful auth
   */
  async cleanupSession(sessionToken: string): Promise<void> {
    await this.tokenService.deleteOtpSession(sessionToken);
  }
}
