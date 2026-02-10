import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  ValidateIf,
} from 'class-validator';

export class LoginDto {
  @ValidateIf((o) => !o.phone)
  @IsEmail({}, { message: 'Must provide a valid email' })
  @IsOptional()
  email?: string;

  @ValidateIf((o) => !o.email)
  @IsString()
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message: 'Phone number must be in E.164 format (e.g., +919876543210)',
  })
  @IsOptional()
  phone?: string;

  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  password: string;
}
