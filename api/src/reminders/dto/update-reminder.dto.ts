import { PartialType } from '@nestjs/mapped-types';
import { CreateReminderDto } from './create-reminder.dto';
import { IsString, IsOptional, IsDateString, IsIn } from 'class-validator';

export class UpdateReminderDto extends PartialType(CreateReminderDto) {
  @IsOptional()
  @IsString()
  @IsIn(['pending', 'completed', 'skipped', 'deleted'])
  completion_status?: string;

  @IsOptional()
  @IsDateString()
  completed_at?: string;

  @IsOptional()
  @IsDateString()
  accepted_time?: string;
}
