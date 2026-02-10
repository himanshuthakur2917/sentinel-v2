"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
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
import { authApi } from "@/lib/api";

export default function VerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email");
  const phone = searchParams.get("phone");

  const [emailOtp, setEmailOtp] = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const sessionToken = searchParams.get("session");
  const passwordHash = searchParams.get("passwordHash");

  const verifyMutation = useMutation({
    mutationFn: authApi.verifyOtp,
    onSuccess: (data, variables) => {
      if (variables.identifierType === "email") {
        setEmailVerified(true);
        toast.success("Email verified successfully");
      } else {
        setPhoneVerified(true);
        toast.success("Phone verified successfully");

        // If both are verified, proceed to onboarding
        if (emailVerified && data.fullyVerified) {
          const params = new URLSearchParams({
            session: sessionToken!,
            passwordHash: passwordHash || "",
          });
          router.push(`/onboarding?${params.toString()}`);
        }
      }
    },
    onError: (error: Error, variables) => {
      const type = variables.identifierType === "email" ? "Email" : "Phone";
      toast.error(`${type} verification failed: ${error.message}`);
    },
  });

  useEffect(() => {
    if (!email || !phone || !sessionToken) {
      router.push("/auth/register");
    }
  }, [email, phone, sessionToken, router]);

  const handleVerifyEmail = () => {
    if (!email || !sessionToken || emailOtp.length !== 6) return;
    verifyMutation.mutate({
      sessionToken,
      identifier: email,
      identifierType: "email",
      code: emailOtp,
    });
  };

  const handleVerifyPhone = () => {
    if (!phone || !sessionToken || phoneOtp.length !== 6) return;
    verifyMutation.mutate({
      sessionToken,
      identifier: phone,
      identifierType: "phone",
      code: phoneOtp,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Verify email first if not verified
    if (!emailVerified && emailOtp.length === 6) {
      handleVerifyEmail();
    }

    // Verify phone if not verified
    if (!phoneVerified && phoneOtp.length === 6) {
      handleVerifyPhone();
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md border-border/50 bg-card/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold tracking-tight">
            Verify your identity
          </CardTitle>
          <CardDescription>
            Enter the codes sent to your email and phone
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email-otp">Email Code ({email})</Label>
              <div className="flex gap-2">
                <Input
                  id="email-otp"
                  type="text"
                  placeholder="123456"
                  required
                  value={emailOtp}
                  onChange={(e) => setEmailOtp(e.target.value)}
                  disabled={verifyMutation.isPending || emailVerified}
                  className="text-center tracking-widest"
                  maxLength={6}
                />
                <Button
                  type="button"
                  onClick={handleVerifyEmail}
                  disabled={
                    verifyMutation.isPending ||
                    emailVerified ||
                    emailOtp.length !== 6
                  }
                  className="min-w-24"
                >
                  {emailVerified
                    ? "Verified ✓"
                    : verifyMutation.isPending
                      ? "Verifying..."
                      : "Verify"}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone-otp">Phone Code ({phone})</Label>
              <div className="flex gap-2">
                <Input
                  id="phone-otp"
                  type="text"
                  placeholder="123456"
                  required
                  value={phoneOtp}
                  onChange={(e) => setPhoneOtp(e.target.value)}
                  disabled={verifyMutation.isPending || phoneVerified}
                  className="text-center tracking-widest"
                  maxLength={6}
                />
                <Button
                  type="button"
                  onClick={handleVerifyPhone}
                  disabled={
                    verifyMutation.isPending ||
                    phoneVerified ||
                    phoneOtp.length !== 6
                  }
                  className="min-w-24"
                >
                  {phoneVerified
                    ? "Verified ✓"
                    : verifyMutation.isPending
                      ? "Verifying..."
                      : "Verify"}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
