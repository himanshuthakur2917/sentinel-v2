"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { IndividualDashboard } from "@/components/dashboard/individual-dashboard";
import { TeamManagerDashboard } from "@/components/dashboard/team-dashboard";
import { OnboardingDialog } from "@/components/dashboard/OnboardingDialog";
import { authApi } from "@/lib/api/auth.api";
import { useAuthStore } from "@/store/auth.store";
import { Loader2 } from "lucide-react";

export default function DashboardPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;
  const { user, setUser } = useAuthStore();

  const [userType, setUserType] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // If user is already in store, use it
        if (user) {
          setUserType(user.userType);
          setShowOnboarding(!user.onboardingCompleted);
          setLoading(false);
          return;
        }

        // Otherwise fetch from API (uses HttpOnly cookies)
        const userData = await authApi.getMe();

        setUser({
          id: userData.id,
          fullName: userData.full_name,
          userName: userData.user_name,
          profilePictureUrl: userData.profile_picture_url,
          email: userData.email,
          userType: userData.user_type,
          onboardingCompleted: userData.onboarding_completed,
        });

        setUserType(userData.user_type);
        setShowOnboarding(!userData.onboarding_completed);
        setLoading(false);
      } catch (error) {
        console.error("Dashboard auth check failed:", error);
        // Clear invalid cookies to prevent redirect loop
        try {
          await authApi.clearCookies();
        } catch (e) {
          console.error("Failed to clear cookies:", e);
        }
        router.push("/auth/login");
      }
    };

    checkAuth();
  }, [router, user, setUser]);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
  };

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
    <>
      <OnboardingDialog
        open={showOnboarding}
        onComplete={handleOnboardingComplete}
      />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          {userType === "team_manager" ? (
            <TeamManagerDashboard userId={userId} />
          ) : (
            <IndividualDashboard userId={userId} />
          )}
        </div>
      </div>
    </>
  );
}
