"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { authApi } from "@/lib/api/auth.api";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";

interface OnboardingDialogProps {
  open: boolean;
  onComplete: () => void;
}

export function OnboardingDialog({ open, onComplete }: OnboardingDialogProps) {
  const { setUser, user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(
    null,
  );
  const [formData, setFormData] = useState({
    fullName: "",
    username: "",
    country: "",
    timezone: "",
    userType: "",
  });

  // Debounced username check
  useEffect(() => {
    const checkUsername = async () => {
      if (formData.username.length < 3) {
        setUsernameAvailable(null);
        return;
      }

      setCheckingUsername(true);
      try {
        const { available } = await authApi.checkUsername(formData.username);
        setUsernameAvailable(available);
        if (!available) {
          toast.error("Username is already taken");
        }
      } catch (error) {
        console.error("Failed to check username:", error);
      } finally {
        setCheckingUsername(false);
      }
    };

    const timeoutId = setTimeout(() => {
      checkUsername();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [formData.username]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.fullName) {
      toast.error("Please enter your full name");
      return;
    }

    if (!formData.userType) {
      toast.error("Please select a user type");
      return;
    }

    if (usernameAvailable === false) {
      toast.error("Please choose a different username");
      return;
    }

    setLoading(true);
    try {
      // Use updateProfile endpoint (JWT auth from cookies)
      const response = await authApi.updateProfile({
        fullName: formData.fullName,
        userName: formData.username,
        userType: formData.userType as
          | "student"
          | "working_professional"
          | "team_manager",
        country: formData.country,
        timezone: formData.timezone,
        theme: "system",
        language: "en",
      });

      // Update Zustand store with new onboarding status
      if (user) {
        setUser({
          ...user,
          onboardingCompleted: true,
        });
      }

      toast.success("Profile completed successfully!");
      onComplete();
    } catch (error: any) {
      console.error("Onboarding error:", error);
      toast.error(error.message || "Failed to complete profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-[500px]"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Complete Your Profile</DialogTitle>
          <DialogDescription>
            Please complete your profile to continue using Sentinel
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              placeholder="John Doe"
              required
              value={formData.fullName}
              onChange={(e) =>
                setFormData({ ...formData, fullName: e.target.value })
              }
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <div className="relative">
              <Input
                id="username"
                placeholder="johndoe"
                required
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
                disabled={loading}
                className={
                  usernameAvailable === true
                    ? "border-green-500 focus-visible:ring-green-500"
                    : usernameAvailable === false
                      ? "border-destructive focus-visible:ring-destructive"
                      : ""
                }
              />
              {checkingUsername && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
            {usernameAvailable === false && (
              <p className="text-xs text-destructive">
                Username is already taken
              </p>
            )}
            {usernameAvailable === true && (
              <p className="text-xs text-green-500">Username is available</p>
            )}
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

          <Button
            className="w-full mt-4"
            type="submit"
            disabled={loading || usernameAvailable === false}
          >
            {loading ? "Completing..." : "Complete Profile"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
