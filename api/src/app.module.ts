import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuditModule } from './audit';

@Module({
  imports: [AuditModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
