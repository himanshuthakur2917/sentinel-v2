import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { OnModuleInit } from '@nestjs/common';
import { SupabaseService } from '../database';
import { AuditService } from '../audit';

@WebSocketGateway({
  cors: {
    origin: '*', // Adjust this for production security
  },
  namespace: 'reminders',
})
export class RemindersGateway
  implements
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnModuleInit
{
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly auditService: AuditService,
  ) {}

  afterInit() {
    this.auditService.success(
      'WebSocket Gateway initialized',
      'RemindersGateway',
    );
  }

  handleConnection(client: Socket) {
    // Optional: Authenticate connection here using JWT if needed
    // const token = client.handshake.headers.authorization;
    this.auditService.debug(
      `Client connected: ${client.id}`,
      'RemindersGateway',
    );
  }

  handleDisconnect(client: Socket) {
    this.auditService.debug(
      `Client disconnected: ${client.id}`,
      'RemindersGateway',
    );
  }

  onModuleInit() {
    this.subscribeToSupabaseChanges();
  }

  private subscribeToSupabaseChanges() {
    const client = this.supabaseService.getClient();

    client
      .channel('custom-all-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reminders' },
        (payload) => {
          this.auditService.debug(
            `Supabase change detected: ${payload.eventType}`,
            'RemindersGateway',
          );

          // Broadcast to all connected clients AND user-specific rooms
          const eventMap = {
            INSERT: 'reminder:created',
            UPDATE: 'reminder:updated',
            DELETE: 'reminder:deleted',
          };

          const event = eventMap[payload.eventType];
          if (event) {
            const data = payload.new || payload.old;

            // Emit to all clients (global broadcast)
            this.server.emit(event, data);

            // Emit to user-specific room if user_id exists
            if (data && 'user_id' in data && data.user_id) {
              const userId = String(data.user_id);
              this.server.to(`user:${userId}`).emit(event, data);
              this.auditService.debug(
                `Emitted ${event} to user:${userId}`,
                'RemindersGateway',
              );
            }
          }
        },
      )
      .subscribe();

    this.auditService.success(
      'Subscribed to Supabase reminders changes',
      'RemindersGateway',
    );
  }

  /**
   * Allow clients to join their user-specific room
   */
  joinUserRoom(client: Socket, userId: string) {
    client.join(`user:${userId}`);
    this.auditService.debug(
      `Client ${client.id} joined room user:${userId}`,
      'RemindersGateway',
    );
  }
}
