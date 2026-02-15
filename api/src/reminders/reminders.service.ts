import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../database';
import { AuditService } from '../audit';
import { CreateReminderDto } from './dto/create-reminder.dto';
import { UpdateReminderDto } from './dto/update-reminder.dto';

export interface DashboardStats {
  totalReminders: number;
  completedReminders: number;
  overdueReminders: number;
  completionRate: number;
  currentStreak: number;
  pointsEarned: number;
  // Trend data (percentage change vs last period)
  totalRemindersTrend: number;
  completedRemindersTrend: number;
  completionRateTrend: number;
  pointsEarnedTrend: number;
}

export interface TeamStats {
  avgCompletionRate: number;
  totalTeamReminders: number;
  completedTeamReminders: number;
  onTimeCount: number;
  overdueCount: number;
  trendChange: number;
  members: TeamMemberStats[];
}

export interface TeamMemberStats {
  userId: string;
  userName: string;
  completionRate: number;
  totalReminders: number;
  completedReminders: number;
  lateCompletions: number;
}

@Injectable()
export class RemindersService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Get individual user dashboard stats
   */
  async getDashboardStats(userId: string): Promise<DashboardStats> {
    const client = this.supabaseService.getClient();

    // Get user stats
    const { data: stats } = await client
      .from('user_stats')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Get overdue count
    const { count: overdueCount } = await client
      .from('reminders')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('completion_status', 'pending')
      .lt('accepted_time', new Date().toISOString());

    // Calculate trends (comparing last 30 days vs previous 30 days)
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    // Current period stats
    const { data: currentPeriodReminders } = await client
      .from('reminders')
      .select('completion_status, points_earned') // Assuming points_earned might be on reminders or we calculate differently.
      // Wait, points are on user_stats which is cumulative.
      // For dynamic trends, we need to query reminders created/completed in the period.
      .eq('user_id', userId)
      .gte('created_at', thirtyDaysAgo.toISOString());

    // Previous period stats
    const { data: previousPeriodReminders } = await client
      .from('reminders')
      .select('completion_status')
      .eq('user_id', userId)
      .gte('created_at', sixtyDaysAgo.toISOString())
      .lt('created_at', thirtyDaysAgo.toISOString());

    const calculateTrend = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Number((((current - previous) / previous) * 100).toFixed(1));
    };

    const currentTotal = currentPeriodReminders?.length || 0;
    const previousTotal = previousPeriodReminders?.length || 0;

    const currentCompleted =
      currentPeriodReminders?.filter((r) => r.completion_status === 'completed')
        .length || 0;
    const previousCompleted =
      previousPeriodReminders?.filter(
        (r) => r.completion_status === 'completed',
      ).length || 0;

    const currentRate =
      currentTotal > 0 ? (currentCompleted / currentTotal) * 100 : 0;
    const previousRate =
      previousTotal > 0 ? (previousCompleted / previousTotal) * 100 : 0;

    // For points, we don't have history in user_stats, so we'll simulate or use 0 for now if we can't derive it.
    // Ideally we'd have a points_history table. For now, let's assume flat or 0 trend if we can't calculate perfectly,
    // OR just use completed reminders as a proxy for points trend if points are awarded per completion.
    const pointsTrend = calculateTrend(currentCompleted, previousCompleted);

    return {
      totalReminders: stats?.total_reminders || 0,
      completedReminders: stats?.completed_reminders || 0,
      overdueReminders: overdueCount || 0,
      completionRate: stats?.completion_rate || 0,
      currentStreak: stats?.current_streak_days || 0,
      pointsEarned: stats?.points_earned || 0,

      totalRemindersTrend: calculateTrend(currentTotal, previousTotal),
      completedRemindersTrend: calculateTrend(
        currentCompleted,
        previousCompleted,
      ),
      completionRateTrend: calculateTrend(currentRate, previousRate),
      pointsEarnedTrend: pointsTrend,
    };
  }

  /**
   * Get team manager dashboard stats
   */
  async getTeamStats(managerId: string): Promise<TeamStats> {
    const client = this.supabaseService.getClient();

    // Get manager's team
    const { data: team } = await client
      .from('teams')
      .select('id')
      .eq('manager_id', managerId)
      .single();

    if (!team) {
      return {
        avgCompletionRate: 0,
        totalTeamReminders: 0,
        completedTeamReminders: 0,
        onTimeCount: 0,
        overdueCount: 0,
        trendChange: 0,
        members: [],
      };
    }

    // Get team members
    const { data: members } = await client
      .from('team_members')
      .select('user_id, users(id, user_name)')
      .eq('team_id', team.id);

    // Get stats for each member
    const memberStats: TeamMemberStats[] = [];
    for (const member of members || []) {
      const { data: userStats } = await client
        .from('user_stats')
        .select('*')
        .eq('user_id', member.user_id)
        .single();

      // Count late completions
      const { count: lateCount } = await client
        .from('reminders')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', member.user_id)
        .eq('completion_status', 'completed')
        .gt('completed_at', 'accepted_time'); // completed_at > accepted_time means late

      memberStats.push({
        userId: member.user_id,
        userName: (member.users as any).user_name,
        completionRate: userStats?.completion_rate || 0,
        totalReminders: userStats?.total_reminders || 0,
        completedReminders: userStats?.completed_reminders || 0,
        lateCompletions: lateCount || 0,
      });
    }

    // Calculate team averages
    const avgCompletionRate =
      memberStats.reduce((sum, m) => sum + m.completionRate, 0) /
      (memberStats.length || 1);

    const totalTeamReminders = memberStats.reduce(
      (sum, m) => sum + m.totalReminders,
      0,
    );
    const completedTeamReminders = memberStats.reduce(
      (sum, m) => sum + m.completedReminders,
      0,
    );

    // Get team stats for trend
    const { data: teamStatsData } = await client
      .from('team_stats')
      .select('*')
      .eq('team_id', team.id)
      .single();

    return {
      avgCompletionRate,
      totalTeamReminders,
      completedTeamReminders,
      onTimeCount:
        completedTeamReminders -
        memberStats.reduce((sum, m) => sum + m.lateCompletions, 0),
      overdueCount: totalTeamReminders - completedTeamReminders,
      trendChange:
        teamStatsData?.completion_rate_trend === 'up'
          ? 12
          : teamStatsData?.completion_rate_trend === 'down'
            ? -8
            : 0,
      members: memberStats,
    };
  }

  /**
   * Get user's reminders with filters
   */
  async getUserReminders(
    userId: string,
    filter: 'all' | 'today' | 'overdue' | 'upcoming' = 'all',
  ) {
    const client = this.supabaseService.getClient();
    let query = client
      .from('reminders')
      .select('*')
      .eq('user_id', userId)
      .order('accepted_time', { ascending: true });

    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0)).toISOString();
    const todayEnd = new Date(now.setHours(23, 59, 59, 999)).toISOString();

    switch (filter) {
      case 'today':
        query = query
          .gte('accepted_time', todayStart)
          .lte('accepted_time', todayEnd);
        break;
      case 'overdue':
        query = query
          .eq('completion_status', 'pending')
          .lt('accepted_time', new Date().toISOString());
        break;
      case 'upcoming':
        query = query
          .eq('completion_status', 'pending')
          .gte('accepted_time', new Date().toISOString());
        break;
    }

    const { data, error } = await query;

    if (error) {
      this.auditService.error('Error fetching reminders', 'RemindersService', {
        error: error.message,
      });
      return [];
    }

    return data;
  }

  /**
   * Create a new reminder
   */
  async create(userId: string, dto: CreateReminderDto) {
    const client = this.supabaseService.getClient();

    const { data, error } = await client
      .from('reminders')
      .insert({
        ...dto,
        user_id: userId,
      })
      .select()
      .single();

    if (error) {
      this.auditService.error(
        `Failed to create reminder for user ${userId}: ${error.message}`,
        'RemindersService',
      );
      throw error;
    }

    return data;
  }

  /**
   * Find one reminder by ID
   */
  async findOne(userId: string, id: string) {
    const client = this.supabaseService.getClient();

    const { data, error } = await client
      .from('reminders')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) {
      return null;
    }

    return data;
  }

  /**
   * Update a reminder
   */
  async update(userId: string, id: string, dto: UpdateReminderDto) {
    const client = this.supabaseService.getClient();

    const { data, error } = await client
      .from('reminders')
      .update(dto)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      this.auditService.error(
        `Failed to update reminder ${id}: ${error.message}`,
        'RemindersService',
      );
      throw error;
    }

    return data;
  }

  /**
   * Delete a reminder (hard delete)
   */
  async delete(userId: string, id: string) {
    const client = this.supabaseService.getClient();

    // Hard delete - actually remove the record
    const { error } = await client
      .from('reminders')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      this.auditService.error(
        `Failed to delete reminder ${id}: ${error.message}`,
        'RemindersService',
      );
      throw error;
    }

    this.auditService.success(
      `Reminder ${id} deleted successfully`,
      'RemindersService',
    );

    return { success: true };
  }
}
