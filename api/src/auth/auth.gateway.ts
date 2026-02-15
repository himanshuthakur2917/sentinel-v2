import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { OnModuleInit, Inject, Injectable } from '@nestjs/common';
import { SupabaseService } from '../database';
import { AuditService } from '../audit';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/constants';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'auth',
})
@Injectable()
export class AuthGateway implements OnGatewayInit, OnModuleInit {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly auditService: AuditService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  afterInit() {
    this.auditService.success(
      'Auth WebSocket Gateway initialized',
      'AuthGateway',
    );
  }

  onModuleInit() {
    this.subscribeToUserChanges();
  }

  private subscribeToUserChanges() {
    const client = this.supabaseService.getClient();

    client
      .channel('public-users-channel')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'users' },
        (payload) => {
          void (async () => {
            this.auditService.debug(
              `User update detected for ID: ${payload.new.id}`,
              'AuthGateway',
            );

            // Invalidate user profile cache
            const userId = payload.new.id;
            const cacheKey = `user:profile:${userId}`;

            try {
              await this.redis.del(cacheKey);
              this.auditService.info(
                `Invalidated user profile cache for ${userId}`,
                'AuthGateway',
              );
            } catch (error) {
              this.auditService.error(
                `Failed to invalidate cache for ${userId}: ${error.message}`,
                'AuthGateway',
              );
            }
          })();
        },
      )
      .subscribe();

    this.auditService.success(
      'Subscribed to Supabase users table changes',
      'AuthGateway',
    );
  }
}
