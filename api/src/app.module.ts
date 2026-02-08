import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from './config';
import { AuditModule } from './audit';
import { DatabaseModule } from './database';
import { AuthModule } from './auth';

@Module({
  imports: [ConfigModule, AuditModule, DatabaseModule, AuthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
