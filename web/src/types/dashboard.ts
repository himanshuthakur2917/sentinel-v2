// Dashboard Stats Types
export interface DashboardStats {
  totalReminders: number;
  completedReminders: number;
  overdueReminders: number;
  completionRate: number;
  currentStreak: number;
  pointsEarned: number;
}

export interface TeamMemberStats {
  userId: string;
  userName: string;
  completionRate: number;
  totalReminders: number;
  completedReminders: number;
  lateCompletions: number;
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
