import { Module } from '@nestjs/common';
import { RemindersController } from './reminders.controller';
import { RemindersService } from './reminders.service';
import { RemindersGateway } from './reminders.gateway';
import { DatabaseModule } from '../database';
import { AuditModule } from '../audit';

@Module({
  imports: [DatabaseModule, AuditModule],
  controllers: [RemindersController],
  providers: [RemindersService, RemindersGateway],
  exports: [RemindersService],
})
export class RemindersModule {}
