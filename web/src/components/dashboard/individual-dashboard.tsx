"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getSocket, disconnectSocket } from "@/lib/socket";
import { reminderApi } from "@/lib/api/reminders.api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import RemindersDashboard from "./reminder/reminders-dashboard";
import type { DashboardStats } from "@/types/dashboard";
import type { Reminder } from "@/types/reminder/reminder";

export function IndividualDashboard({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["dashboard-stats", userId],
    queryFn: () => reminderApi.getStats(),
  });

  const { data: reminders, isLoading: remindersLoading } = useQuery<Reminder[]>(
    {
      queryKey: ["reminders", userId],
      queryFn: () => reminderApi.getReminders(),
    },
  );

  useEffect(() => {
    const socket = getSocket();

    const handleReminderUpdate = () => {
      // Invalidate queries to fetch fresh data
      queryClient.invalidateQueries({ queryKey: ["reminders"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    };

    socket.on("connect", () => {
      console.log("Connected to websocket");
    });

    socket.on("reminder:created", handleReminderUpdate);
    socket.on("reminder:updated", handleReminderUpdate);
    socket.on("reminder:deleted", handleReminderUpdate);

    return () => {
      socket.off("reminder:created", handleReminderUpdate);
      socket.off("reminder:updated", handleReminderUpdate);
      socket.off("reminder:deleted", handleReminderUpdate);
      disconnectSocket();
    };
  }, [queryClient]);

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
