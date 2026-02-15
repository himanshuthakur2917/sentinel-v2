import { Module } from '@nestjs/common';
import { RemindersController } from './reminders.controller';
import { RemindersService } from './reminders.service';
import { RemindersGateway } from './reminders.gateway';
import { DatabaseModule } from '../database';
import { AuditModule } from '../audit';
import { VoiceController } from './voice/voice.controller';
import { VoiceService } from './voice/voice.service';
import { UserStatsService } from './user-stats.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [DatabaseModule, AuditModule, ConfigModule],
  controllers: [RemindersController, VoiceController],
  providers: [
    RemindersService,
    RemindersGateway,
    VoiceService,
    UserStatsService,
  ],
  exports: [RemindersService],
})
export class RemindersModule {}
