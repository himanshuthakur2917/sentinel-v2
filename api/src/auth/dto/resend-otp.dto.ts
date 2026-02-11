import { IsString, IsEnum } from 'class-validator';

export class ResendOtpDto {
  @IsString()
  sessionToken: string;

  @IsEnum(['email', 'phone'])
  identifierType: 'email' | 'phone';

  @IsString()
  identifier: string;
}
