"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { authApi } from "@/lib/api/auth.api";
import { OnboardingRequest } from "@/lib/api/types";
import { Loader2 } from "lucide-react";

function OnboardingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionToken = searchParams.get("session");
  const passwordHash = searchParams.get("passwordHash");

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    country: "",
    timezone: "",
    userType: "", // Added userType
  });

  useEffect(() => {
    if (!sessionToken || !passwordHash) {
      toast.error("Missing session information. Please register again.");
      router.push("/auth/register");
    }
  }, [sessionToken, passwordHash, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!sessionToken || !passwordHash) {
      toast.error("Invalid session");
      return;
    }

    if (!formData.userType) {
      toast.error("Please select a user type");
      return;
    }

    setLoading(true);
    try {
      const payload: OnboardingRequest = {
        sessionToken,
        userName: formData.username,
        userType: formData.userType as
          | "student"
          | "working_professional"
          | "team_manager",
        country: formData.country,
        timezone: formData.timezone,
        passwordHash,
        theme: "system",
        language: "en",
      };

      const response = await authApi.completeOnboarding(payload);

      // Manually set the cookie to ensure middleware can read it immediately
      if (response.accessToken) {
        document.cookie = `accessToken=${response.accessToken}; path=/; max-age=86400; SameSite=Lax`;
        // Also set 'token' just in case
        document.cookie = `token=${response.accessToken}; path=/; max-age=86400; SameSite=Lax`;
      }

      toast.success("Welcome to Sentinel!");
      router.push("/dashboard");
    } catch (error: any) {
      console.error("Onboarding error:", error);
      toast.error(error.message || "Failed to complete onboarding");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-lg border-border/50 bg-card/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold tracking-tight">
            Welcome to Sentinel
          </CardTitle>
          <CardDescription>
            Let&apos;s set up your profile to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                placeholder="johndoe"
                required
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="userType">I am a...</Label>
              <Select
                value={formData.userType}
                onValueChange={(value) =>
                  setFormData({ ...formData, userType: value })
                }
                disabled={loading}
              >
                <SelectTrigger id="userType">
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="working_professional">
                    Working Professional
                  </SelectItem>
                  <SelectItem value="team_manager">Team Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Select
                  value={formData.country}
                  onValueChange={(value) =>
                    setFormData({ ...formData, country: value })
                  }
                  disabled={loading}
                >
                  <SelectTrigger id="country">
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="us">United States</SelectItem>
                    <SelectItem value="in">India</SelectItem>
                    <SelectItem value="uk">United Kingdom</SelectItem>
                    <SelectItem value="ca">Canada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select
                  value={formData.timezone}
                  onValueChange={(value) =>
                    setFormData({ ...formData, timezone: value })
                  }
                  disabled={loading}
                >
                  <SelectTrigger id="timezone">
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="utc">UTC</SelectItem>
                    <SelectItem value="est">EST</SelectItem>
                    <SelectItem value="pst">PST</SelectItem>
                    <SelectItem value="ist">IST</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button className="w-full mt-4" type="submit" disabled={loading}>
              {loading ? "Setting up..." : "Complete Setup"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// Wrap in Suspense to satisfy Next.js build requirements
export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      }
    >
      <OnboardingPageContent />
    </Suspense>
  );
}
