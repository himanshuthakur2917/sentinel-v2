import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';
import { AuditService } from '../../audit';

@Injectable()
export class SmsProvider {
  private client: Twilio | null = null;
  private fromNumber: string | undefined;
  private isDevelopment: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
  ) {
    this.isDevelopment = this.configService.get('NODE_ENV') !== 'production';
    this.initializeClient();
  }

  private initializeClient() {
    const accountSid = this.configService.get<string>('otp.twilio.accountSid');
    const authToken = this.configService.get<string>('otp.twilio.authToken');
    this.fromNumber = this.configService.get<string>('otp.twilio.phoneNumber');

    if (!accountSid || !authToken || !this.fromNumber) {
      this.auditService.warn(
        'Twilio credentials not configured. SMS OTPs will be logged to console only.',
        'SmsProvider',
      );
      return;
    }

    this.client = new Twilio(accountSid, authToken);
    this.auditService.success('Twilio client initialized', 'SmsProvider');
  }

  async sendOtp(phone: string, code: string): Promise<boolean> {
    // In development, always log to console
    if (this.isDevelopment) {
      this.auditService.info(`📱 OTP for ${phone}: ${code}`, 'SmsProvider', {
        mode: 'development',
      });
    }

    // If no client, just return true (dev mode)
    if (!this.client) {
      return true;
    }

    try {
      await this.client.messages.create({
        body: `Your Sentinel verification code is: ${code}. Valid for 5 minutes.`,
        from: this.fromNumber,
        to: phone,
      });

      this.auditService.success(`OTP SMS sent to ${phone}`, 'SmsProvider');
      return true;
    } catch (error) {
      this.auditService.error(
        `Failed to send OTP SMS to ${phone}`,
        'SmsProvider',
        { error: (error as Error).message },
      );
      return false;
    }
  }
}
