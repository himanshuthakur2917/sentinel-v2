"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { IndividualDashboard } from "@/components/dashboard/individual-dashboard";
import { TeamManagerDashboard } from "@/components/dashboard/team-dashboard";
import { getTokenFromCookies, getUserFromToken } from "@/lib/auth/jwt";
import { Loader2 } from "lucide-react";

export default function DashboardPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const [userType, setUserType] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getTokenFromCookies();
    if (!token) {
      router.push("/auth/login");
      return;
    }

    const user = getUserFromToken(token);
    if (!user) {
      router.push("/auth/login");
      return;
    }

    setUserType(user.userType);
    setLoading(false);
  }, [router]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!userType) {
    return null;
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        {userType === "team_manager" ? (
          <TeamManagerDashboard userId={userId} />
        ) : (
          <IndividualDashboard userId={userId} />
        )}
      </div>
    </div>
  );
}
