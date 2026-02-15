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

          // Broadcast to all connected clients
          // In a real app, you might want to filter this by user_id
          // payload.new contains the new record, including user_id

          const eventMap = {
            INSERT: 'reminder:created',
            UPDATE: 'reminder:updated',
            DELETE: 'reminder:deleted',
          };

          const event = eventMap[payload.eventType];
          if (event) {
            this.server.emit(event, payload.new || payload.old);
          }
        },
      )
      .subscribe();

    this.auditService.success(
      'Subscribed to Supabase reminders changes',
      'RemindersGateway',
    );
  }
}
