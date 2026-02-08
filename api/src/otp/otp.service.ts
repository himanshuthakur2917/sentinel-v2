import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../database';
import { AuditService } from '../audit';
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
    private readonly supabaseService: SupabaseService,
    private readonly auditService: AuditService,
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
    const expiresAt = new Date(Date.now() + this.expiryMinutes * 60 * 1000);

    const client = this.supabaseService.getClient();

    // Store both codes in database
    const { error } = await client.from('verification_codes').insert([
      {
        identifier: email,
        identifier_type: 'email',
        code: emailCode,
        expires_at: expiresAt.toISOString(),
        session_token: sessionToken,
      },
      {
        identifier: phone,
        identifier_type: 'phone',
        code: phoneCode,
        expires_at: expiresAt.toISOString(),
        session_token: sessionToken,
      },
    ]);

    if (error) {
      this.auditService.error(
        'Failed to store verification codes',
        'OtpService',
        {
          error: error.message,
        },
      );
      throw new Error('Failed to initiate verification');
    }

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
    const client = this.supabaseService.getClient();

    // Get the verification record
    const { data: record, error: fetchError } = await client
      .from('verification_codes')
      .select('*')
      .eq('session_token', sessionToken)
      .eq('identifier', identifier)
      .eq('identifier_type', identifierType)
      .single();

    if (fetchError || !record) {
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

    // Check if expired
    if (new Date(record.expires_at) < new Date()) {
      this.auditService.warn('OTP expired', 'OtpService', { identifier });
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
    await client
      .from('verification_codes')
      .update({ attempts: record.attempts + 1 })
      .eq('id', record.id);

    // Verify code
    if (record.code !== code) {
      this.auditService.warn('Invalid OTP code', 'OtpService', { identifier });
      return false;
    }

    // Mark as verified
    await client
      .from('verification_codes')
      .update({ verified: true })
      .eq('id', record.id);

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
    const client = this.supabaseService.getClient();

    const { data: records, error } = await client
      .from('verification_codes')
      .select('*')
      .eq('session_token', sessionToken);

    if (error || !records || records.length !== 2) {
      return null;
    }

    const emailRecord = records.find((r) => r.identifier_type === 'email');
    const phoneRecord = records.find((r) => r.identifier_type === 'phone');

    if (!emailRecord || !phoneRecord) {
      return null;
    }

    return {
      sessionToken,
      email: emailRecord.identifier,
      phone: phoneRecord.identifier,
      emailVerified: emailRecord.verified,
      phoneVerified: phoneRecord.verified,
    };
  }

  /**
   * Clean up verification records after successful auth
   */
  async cleanupSession(sessionToken: string): Promise<void> {
    const client = this.supabaseService.getClient();
    await client
      .from('verification_codes')
      .delete()
      .eq('session_token', sessionToken);
  }
}
