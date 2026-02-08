import { Module, Global, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { AuditService } from '../audit';
import { TokenService } from './token.service';

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: (
        configService: ConfigService,
        auditService: AuditService,
      ) => {
        const host = configService.get<string>('redis.host');
        const port = configService.get<number>('redis.port');
        const password = configService.get<string>('redis.password');
        const db = configService.get<number>('redis.db');
        const keyPrefix = configService.get<string>('redis.keyPrefix');

        const client = new Redis({
          host,
          port,
          password: password || undefined,
          db,
          keyPrefix,
          lazyConnect: true,
          retryStrategy: (times) => {
            if (times > 3) {
              auditService.warn(
                `Redis connection failed after ${times} attempts, running without Redis`,
                'RedisModule',
              );
              return null; // Stop retrying
            }
            return Math.min(times * 200, 2000);
          },
        });

        client.on('connect', () => {
          auditService.success('Redis connected', 'RedisModule');
        });

        client.on('error', (err) => {
          auditService.warn(`Redis error: ${err.message}`, 'RedisModule');
        });

        // Try to connect, but don't fail if Redis is unavailable
        client.connect().catch(() => {
          auditService.warn(
            'Redis not available - falling back to database storage',
            'RedisModule',
          );
        });

        return client;
      },
      inject: [ConfigService, AuditService],
    },
    TokenService,
  ],
  exports: [REDIS_CLIENT, TokenService],
})
export class RedisModule implements OnModuleDestroy {
  constructor(private readonly configService: ConfigService) {}

  async onModuleDestroy() {
    // Clean up Redis connection on shutdown
  }
}
