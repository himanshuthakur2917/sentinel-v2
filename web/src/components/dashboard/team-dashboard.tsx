"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SectionCards } from "../section-cards";
import type { TeamStats } from "@/types/dashboard";

export function TeamManagerDashboard({ userId }: { userId: string }) {
  const { data: teamStats, isLoading } = useQuery<TeamStats>({
    queryKey: ["team-stats", userId],
    queryFn: () => api.get("/reminders/dashboard/team/stats"),
  });

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-6">
        <Skeleton className="h-20" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Skeleton className="h-32" />
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
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Team Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor your team&apos;s performance and completion rates
        </p>
      </div>

      {/* Team Stats Grid */}
      <SectionCards
        cards={[
          {
            title: "Avg Completion Rate",
            value: `${(teamStats?.avgCompletionRate || 0).toFixed(0)}%`,
            trend: teamStats?.trendChange || 0,
            trendLabel: "Team trend",
            footerLabel: "Average across all members",
          },
          {
            title: "Total Reminders",
            value: teamStats?.totalTeamReminders || 0,
            trend: 0,
            trendLabel: "Total assigned",
            footerLabel: "Active team workload",
          },
          {
            title: "On-Time",
            value: teamStats?.onTimeCount || 0,
            trend: 0,
            trendLabel: "Completed on time",
            footerLabel: `${((teamStats?.onTimeCount || 0) / (teamStats?.completedTeamReminders || 1) * 100).toFixed(0)}% of completed`,
          },
          {
            title: "Overdue",
            value: teamStats?.overdueCount || 0,
            trend: 0, // could calculate overdue trend if supported
            trendLabel: "Needs attention",
            footerLabel: "Missed deadlines",
          },
        ]}
      />

      {/* Team Members Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members Performance</CardTitle>
        </CardHeader>
        <CardContent>
          {teamStats?.members && teamStats.members.length > 0 ? (
            <div className="space-y-4">
              {teamStats.members.map((member) => (
                <div
                  key={member.userId}
                  className="p-4 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold">{member.userName}</h3>
                      <p className="text-sm text-muted-foreground">
                        {member.completedReminders}/{member.totalReminders}{" "}
                        completed
                        {member.lateCompletions > 0 &&
                          ` • ${member.lateCompletions} late`}
                      </p>
                    </div>
                    <div className="text-right">
                      <div
                        className={`text-2xl font-bold ${
                          member.completionRate >= 90
                            ? "text-green-600"
                            : member.completionRate >= 70
                              ? "text-yellow-600"
                              : "text-red-600"
                        }`}
                      >
                        {(member.completionRate || 0).toFixed(0)}%
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {member.completionRate >= 90
                          ? "⭐ Excellent"
                          : member.completionRate >= 70
                            ? "⚠️ Good"
                            : "⚠️ Needs Attention"}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No team members found. Invite team members to get started.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
