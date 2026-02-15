import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SupabaseService } from '../database';
import type { RealtimeChannel } from '@supabase/supabase-js';

@Injectable()
export class UserStatsService implements OnModuleInit {
  private readonly logger = new Logger(UserStatsService.name);
  private realtimeChannel: RealtimeChannel;

  constructor(private readonly supabaseService: SupabaseService) {}

  async onModuleInit() {
    this.logger.log('Initializing UserStatsService...');
    this.subscribeToReminderChanges();
  }

  /**
   * Subscribe to reminders table changes via Supabase Realtime
   */
  private subscribeToReminderChanges() {
    try {
      const client = this.supabaseService.getClient();

      this.realtimeChannel = client
        .channel('reminders-stats-sync')
        .on(
          'postgres_changes',
          {
            event: '*', // Listen to INSERT, UPDATE, DELETE
            schema: 'public',
            table: 'reminders',
          },
          (payload) => {
            void this.handleReminderChange(payload);
          },
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            this.logger.log(
              'Successfully subscribed to reminders table changes',
            );
          } else if (status === 'CHANNEL_ERROR') {
            this.logger.error('Failed to subscribe to reminders channel');
          }
        });
    } catch (error) {
      this.logger.error('Error subscribing to reminders changes', error);
    }
  }

  /**
   * Handle reminder change events from Supabase Realtime
   */
  private async handleReminderChange(payload: any) {
    try {
      const eventType = payload.eventType;
      const userId =
        payload.new?.user_id || payload.old?.user_id || payload.record?.user_id;

      if (!userId) {
        this.logger.warn('Reminder change event missing user_id', payload);
        return;
      }

      this.logger.log(
        `Reminder ${eventType} detected for user ${userId}, recalculating stats...`,
      );

      await this.recalculateUserStats(userId);
    } catch (error) {
      this.logger.error('Error handling reminder change', error);
    }
  }

  /**
   * Recalculate and update user stats for a specific user
   * This provides an additional layer on top of database triggers
   */
  async recalculateUserStats(userId: string): Promise<void> {
    try {
      const client = this.supabaseService.getClient();

      // Count total and completed reminders
      const { data: reminders, error: remindersError } = await client
        .from('reminders')
        .select('completion_status')
        .eq('user_id', userId);

      if (remindersError) {
        throw remindersError;
      }

      const totalReminders = reminders?.length || 0;
      const completedReminders =
        reminders?.filter((r) => r.completion_status === 'completed').length ||
        0;
      const completionRate =
        totalReminders > 0
          ? Number((completedReminders / totalReminders).toFixed(2))
          : 0;

      // Upsert user stats
      const { error: upsertError } = await client.from('user_stats').upsert(
        {
          user_id: userId,
          total_reminders: totalReminders,
          completed_reminders: completedReminders,
          completion_rate: completionRate,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id',
        },
      );

      if (upsertError) {
        throw upsertError;
      }

      this.logger.log(
        `Updated stats for user ${userId}: ${completedReminders}/${totalReminders} (${completionRate * 100}%)`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to recalculate stats for user ${userId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Manual sync method for debugging or cron jobs
   */
  async syncAllUserStats(): Promise<void> {
    try {
      const client = this.supabaseService.getClient();

      // Get all users
      const { data: users, error: usersError } = await client
        .from('users')
        .select('id');

      if (usersError) {
        throw usersError;
      }

      this.logger.log(`Syncing stats for ${users?.length || 0} users...`);

      // Recalculate stats for each user
      for (const user of users || []) {
        await this.recalculateUserStats(user.id);
      }

      this.logger.log('Completed syncing all user stats');
    } catch (error) {
      this.logger.error('Error syncing all user stats', error);
      throw error;
    }
  }

  /**
   * Cleanup on module destroy
   */
  async onModuleDestroy() {
    if (this.realtimeChannel) {
      await this.realtimeChannel.unsubscribe();
      this.logger.log('Unsubscribed from reminders channel');
    }
  }
}
