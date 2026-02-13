"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { TeamStats } from "@/types/dashboard";

export function TeamManagerDashboard({ userId }: { userId: string }) {
  const { data: teamStats, isLoading } = useQuery<TeamStats>({
    queryKey: ["team-stats", userId],
    queryFn: () => api.get("/reminders/dashboard/team/stats"),
  });

  const getTrendIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (change < 0) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-500" />;
  };

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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Completion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold">
                {(teamStats?.avgCompletionRate || 0).toFixed(0)}%
              </div>
              <div className="flex items-center gap-1">
                {getTrendIcon(teamStats?.trendChange || 0)}
                <span className="text-sm text-muted-foreground">
                  {(teamStats?.trendChange ?? 0) > 0 && "+"}
                  {teamStats?.trendChange ?? 0}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Reminders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {teamStats?.totalTeamReminders || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              On-Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {teamStats?.onTimeCount || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Overdue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {teamStats?.overdueCount || 0}
            </div>
          </CardContent>
        </Card>
      </div>

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
