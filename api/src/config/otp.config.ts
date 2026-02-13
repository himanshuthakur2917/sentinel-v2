import { registerAs } from '@nestjs/config';

export default registerAs('otp', () => ({
  expiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES || '2', 10),
  expirySeconds: parseInt(process.env.OTP_EXPIRY_SECONDS || '90', 10), // For login OTP (shorter TTL)
  resendCooldownSeconds: parseInt(
    process.env.OTP_RESEND_COOLDOWN_SECONDS || '30',
    10,
  ),
  maxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS || '3', 10),
  codeLength: 6,

  // Email (Gmail SMTP)
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },

  // SMS (Twilio)
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER,
  },
}));
