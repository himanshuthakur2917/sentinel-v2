import { Module } from '@nestjs/common';
import { OtpService } from './otp.service';
import { EmailProvider } from './providers/email.provider';
import { SmsProvider } from './providers/sms.provider';

@Module({
  providers: [OtpService, EmailProvider, SmsProvider],
  exports: [OtpService],
})
export class OtpModule {}
