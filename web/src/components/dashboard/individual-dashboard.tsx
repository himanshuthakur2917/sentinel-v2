"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import RemindersDashboard from "./reminder/reminders-dashboard";
import type { DashboardStats } from "@/types/dashboard";
import type { Reminder } from "@/types/reminder/reminder";

export function IndividualDashboard({ userId }: { userId: string }) {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["dashboard-stats", userId],
    queryFn: () => api.get("/reminders/dashboard/stats"),
  });

  const { data: reminders, isLoading: remindersLoading } = useQuery<Reminder[]>(
    {
      queryKey: ["reminders", userId],
      queryFn: () => api.get("/reminders"),
    },
  );

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {stats?.completionRate || 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.completedReminders}/{stats?.totalReminders} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Current Streak
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              🔥 {stats?.currentStreak || 0} days
            </div>
            <p className="text-xs text-muted-foreground mt-1">Keep it going!</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Points Earned
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              ⭐ {stats?.pointsEarned || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.overdueReminders} overdue reminders
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Reminders List */}
      {remindersLoading ? (
        <Skeleton className="h-96" />
      ) : (
        <RemindersDashboard reminders={reminders || []} />
      )}
    </div>
  );
}
