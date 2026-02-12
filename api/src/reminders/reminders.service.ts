import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../database';
import { AuditService } from '../audit';

export interface DashboardStats {
  totalReminders: number;
  completedReminders: number;
  overdueReminders: number;
  completionRate: number;
  currentStreak: number;
  pointsEarned: number;
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

    return {
      totalReminders: stats?.total_reminders || 0,
      completedReminders: stats?.completed_reminders || 0,
      overdueReminders: overdueCount || 0,
      completionRate: stats?.completion_rate || 0,
      currentStreak: stats?.current_streak_days || 0,
      pointsEarned: stats?.points_earned || 0,
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
}
