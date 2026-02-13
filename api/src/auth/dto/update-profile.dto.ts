import { IsNotEmpty, IsString, IsIn, IsOptional } from 'class-validator';

export class UpdateProfileDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsString()
  @IsNotEmpty()
  userName: string;

  @IsString()
  @IsIn(['student', 'working_professional', 'team_manager'])
  userType: 'student' | 'working_professional' | 'team_manager';

  @IsString()
  @IsNotEmpty()
  country: string;

  @IsString()
  @IsNotEmpty()
  timezone: string;

  @IsString()
  @IsIn(['light', 'dark', 'system'])
  @IsOptional()
  theme?: 'light' | 'dark' | 'system';

  @IsString()
  @IsIn(['en', 'hi'])
  @IsOptional()
  language?: 'en' | 'hi';
}
