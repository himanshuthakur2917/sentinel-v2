import {
  IsString,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsIn,
  IsUUID,
} from 'class-validator';

export class CreateReminderDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @IsIn(['personal', 'work', 'health', 'other'])
  category: string;

  @IsString()
  @IsOptional()
  @IsIn(['low', 'medium', 'high'])
  priority?: string = 'medium';

  @IsDateString()
  initial_deadline: string;

  @IsOptional()
  @IsBoolean()
  is_recurring?: boolean = false;

  @IsOptional()
  @IsString()
  recurrence_pattern?: string;

  @IsOptional()
  @IsBoolean()
  is_team_reminder?: boolean = false;

  @IsOptional()
  @IsUUID()
  team_id?: string;
}
