import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AuditService } from '../audit';

@Injectable()
export class SupabaseService implements OnModuleInit {
  private client: SupabaseClient;

  constructor(
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
  ) {}

  onModuleInit() {
    const supabaseUrl = this.configService.get<string>('database.supabaseUrl');
    const supabaseKey = this.configService.get<string>('database.supabaseKey');

    if (!supabaseUrl || !supabaseKey) {
      this.auditService.warn(
        'Supabase credentials not configured. Database operations will fail.',
        'SupabaseService',
      );
      return;
    }

    this.client = createClient(supabaseUrl, supabaseKey);
    this.auditService.success('Supabase client initialized', 'SupabaseService');
  }

  getClient(): SupabaseClient {
    return this.client;
  }

  /**
   * Execute a query and log it
   */
  async query<T>(
    table: string,
    operation: 'select' | 'insert' | 'update' | 'delete',
    callback: (
      query: ReturnType<SupabaseClient['from']>,
    ) => Promise<{ data: T | null; error: Error | null }>,
  ): Promise<T | null> {
    const startTime = Date.now();
    const query = this.client.from(table);
    const { data, error } = await callback(query);
    const duration = Date.now() - startTime;

    if (error) {
      this.auditService.error(
        `${operation.toUpperCase()} ${table} failed: ${error.message}`,
        'Database',
        { duration: `${duration}ms` },
      );
      throw error;
    }

    this.auditService.debug(`${operation.toUpperCase()} ${table}`, 'Database', {
      duration: `${duration}ms`,
      rows: Array.isArray(data) ? data.length : 1,
    });

    return data;
  }
}
