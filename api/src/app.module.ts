import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from './config';
import { AuditModule } from './audit';
import { DatabaseModule } from './database';
import { RedisModule } from './redis';
import { AuthModule } from './auth';
import { RemindersModule } from './reminders';
import { ArcjetGuard, ArcjetModule, tokenBucket } from '@arcjet/nest';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ConfigModule,
    AuditModule,
    DatabaseModule,
    RedisModule,
    AuthModule,
    RemindersModule,
    ArcjetModule.forRoot({
      isGlobal: true,
      key: process.env.ARCJET_KEY!,
      rules: [
        // Create a token bucket rate limit. Other algorithms are supported.
        tokenBucket({
          mode: 'LIVE', // will block requests. Use "DRY_RUN" to log only
          refillRate: 5, // refill 5 tokens per interval
          interval: 10, // refill every 10 seconds
          capacity: 10, // bucket maximum capacity of 10 tokens
        }),
      ],
    }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ArcjetGuard,
    },
  ],
})
export class AppModule {}
