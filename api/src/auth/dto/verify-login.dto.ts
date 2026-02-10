import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsOptional,
  IsIn,
  Matches,
  ValidateIf,
} from 'class-validator';

export class VerifyLoginDto {
  @IsString()
  @IsNotEmpty()
  sessionToken: string;

  @ValidateIf((o) => !o.phone)
  @IsEmail()
  @IsOptional()
  email?: string;

  @ValidateIf((o) => !o.email)
  @IsString()
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message: 'Phone number must be in E.164 format',
  })
  @IsOptional()
  phone?: string;

  @IsIn(['email', 'phone'])
  @IsNotEmpty()
  identifierType: 'email' | 'phone';

  @IsString()
  @IsNotEmpty()
  code: string;
}
