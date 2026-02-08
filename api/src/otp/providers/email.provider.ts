import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { AuditService } from '../../audit';

@Injectable()
export class EmailProvider {
  private transporter: nodemailer.Transporter | null = null;
  private isDevelopment: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
  ) {
    this.isDevelopment = this.configService.get('NODE_ENV') !== 'production';
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const host = this.configService.get<string>('otp.smtp.host');
    const port = this.configService.get<number>('otp.smtp.port');
    const user = this.configService.get<string>('otp.smtp.user');
    const pass = this.configService.get<string>('otp.smtp.pass');

    if (!user || !pass) {
      this.auditService.warn(
        'SMTP credentials not configured. Email OTPs will be logged to console only.',
        'EmailProvider',
      );
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    this.auditService.success('Email transporter initialized', 'EmailProvider');
  }

  async sendOtp(email: string, code: string): Promise<boolean> {
    // In development, always log to console
    if (this.isDevelopment) {
      this.auditService.info(`📧 OTP for ${email}: ${code}`, 'EmailProvider', {
        mode: 'development',
      });
    }

    // If no transporter, just return true (dev mode)
    if (!this.transporter) {
      return true;
    }

    try {
      await this.transporter.sendMail({
        from: this.configService.get<string>('otp.smtp.user'),
        to: email,
        subject: 'Your Sentinel Verification Code',
        html: this.getEmailTemplate(code),
      });

      this.auditService.success(`OTP email sent to ${email}`, 'EmailProvider');
      return true;
    } catch (error) {
      this.auditService.error(
        `Failed to send OTP email to ${email}`,
        'EmailProvider',
        { error: (error as Error).message },
      );
      return false;
    }
  }

  private getEmailTemplate(code: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 400px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">Sentinel Verification</h2>
        <p>Your verification code is:</p>
        <div style="background: #f5f5f5; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #333;">${code}</span>
        </div>
        <p style="color: #666; font-size: 14px;">This code expires in 5 minutes.</p>
        <p style="color: #999; font-size: 12px;">If you didn't request this code, please ignore this email.</p>
      </div>
    `;
  }
}
