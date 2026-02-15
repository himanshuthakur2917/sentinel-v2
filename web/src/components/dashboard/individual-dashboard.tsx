"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getSocket, disconnectSocket } from "@/lib/socket";
import { reminderApi } from "@/lib/api/reminders.api";
import { Skeleton } from "@/components/ui/skeleton";
import RemindersDashboard from "./reminder/reminders-dashboard";
import { SectionCards } from "../section-cards";
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
      <SectionCards
        cards={[
          {
            title: "Completion Rate",
            value: `${stats?.completionRate || 0}%`,
            trend: stats?.completionRateTrend || 0,
            trendLabel: "from last 30 days",
            footerLabel: `${stats?.completedReminders || 0}/${stats?.totalReminders || 0} completed`,
          },
          {
            title: "Current Streak",
            value: `${stats?.currentStreak || 0} days`,
            trend: 0, // Streak trend is tricky, maybe 0 for now or diff
            trendLabel: "Keep it going!",
            footerLabel: "Consistency is key",
          },
          {
            title: "Points Earned",
            value: `⭐ ${stats?.pointsEarned || 0}`,
            trend: stats?.pointsEarnedTrend || 0,
            trendLabel: "from last 30 days",
            footerLabel: `${stats?.overdueReminders || 0} overdue reminders`,
          },
          // Added a 4th card to match grid if needed or keep 3. The previous design had 3.
          // The new SectionCards grid is responsive.
        ]}
      />

      {/* Reminders List */}
      {remindersLoading ? (
        <Skeleton className="h-96" />
      ) : (
        <RemindersDashboard reminders={reminders || []} />
      )}
    </div>
  );
}
