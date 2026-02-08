import { IsNotEmpty, IsString, Length, IsIn } from 'class-validator';

export class VerifyOtpDto {
  @IsString()
  @IsNotEmpty()
  sessionToken: string;

  @IsString()
  @IsNotEmpty()
  identifier: string;

  @IsString()
  @IsIn(['email', 'phone'])
  identifierType: 'email' | 'phone';

  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  code: string;
}
