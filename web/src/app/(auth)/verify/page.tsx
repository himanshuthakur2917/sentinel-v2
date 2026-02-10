"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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
import { api } from "@/lib/api";

export default function VerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email");
  const phone = searchParams.get("phone");

  const [emailOtp, setEmailOtp] = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const sessionToken = searchParams.get("session");
  const passwordHash = searchParams.get("passwordHash");

  useEffect(() => {
    if (!email || !phone || !sessionToken) {
      router.push("/auth/register");
    }
  }, [email, phone, sessionToken, router]);

  const verifyCode = async (
    identifier: string,
    identifierType: "email" | "phone",
    code: string,
  ): Promise<{ verified: boolean; fullyVerified: boolean }> => {
    if (!sessionToken) {
      toast.error("Invalid session");
      throw new Error("Invalid session");
    }

    try {
      const response = await api.verifyOtp({
        sessionToken,
        identifier,
        identifierType,
        code,
      });

      if (response.verified) {
        if (identifierType === "email") {
          setEmailVerified(true);
        } else {
          setPhoneVerified(true);
        }
      }

      return response;
    } catch (error) {
      throw error;
    }
  };

  const handleVerifyEmail = async () => {
    if (!email || emailOtp.length !== 6) return;

    try {
      setLoading(true);
      const result = await verifyCode(email, "email", emailOtp);
      if (result.verified) {
        toast.success("Email verified successfully");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Email verification failed",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPhone = async () => {
    if (!phone || phoneOtp.length !== 6) return;

    try {
      setLoading(true);
      const result = await verifyCode(phone, "phone", phoneOtp);
      if (result.verified) {
        toast.success("Phone verified successfully");

        // If both are verified, proceed to onboarding
        if (emailVerified && result.fullyVerified) {
          const params = new URLSearchParams({
            session: sessionToken!,
            passwordHash: passwordHash || "",
          });
          router.push(`/onboarding?${params.toString()}`);
        }
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Phone verification failed",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Verify email first if not verified
    if (!emailVerified && emailOtp.length === 6) {
      await handleVerifyEmail();
    }

    // Verify phone if not verified
    if (!phoneVerified && phoneOtp.length === 6) {
      await handleVerifyPhone();
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
                  disabled={loading || emailVerified}
                  className="text-center tracking-widest"
                  maxLength={6}
                />
                <Button
                  type="button"
                  onClick={handleVerifyEmail}
                  disabled={loading || emailVerified || emailOtp.length !== 6}
                  className="min-w-24"
                >
                  {emailVerified
                    ? "Verified ✓"
                    : loading
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
                  disabled={loading || phoneVerified}
                  className="text-center tracking-widest"
                  maxLength={6}
                />
                <Button
                  type="button"
                  onClick={handleVerifyPhone}
                  disabled={loading || phoneVerified || phoneOtp.length !== 6}
                  className="min-w-24"
                >
                  {phoneVerified
                    ? "Verified ✓"
                    : loading
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
