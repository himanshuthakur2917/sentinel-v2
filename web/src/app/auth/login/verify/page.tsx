"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { authApi } from "@/lib/api/auth.api";
import {
  Mail,
  Phone,
  ArrowRight,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { OtpTimer } from "@/components/auth/OtpTimer";
import { useAuthStore } from "@/store/auth.store";
import { getUserFromToken } from "@/lib/auth/jwt";

function LoginVerifyPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { fetchUser } = useAuthStore();
  
  const sessionToken = searchParams.get("session");
  const identifier = searchParams.get("identifier");
  const identifierType = searchParams.get("type") as "email" | "phone";

  // Use state correctly with type inference
  const [otp, setOtp] = useState("");
  const [expiresAt, setExpiresAt] = useState<string>(
    // Default to 5 minutes from now if not provided (though backend usually handles this)
    () => new Date(Date.now() + 5 * 60 * 1000).toISOString(),
  );
  const [otpExpired, setOtpExpired] = useState(false);

  useEffect(() => {
    if (!sessionToken || !identifier || !identifierType) {
      // If essential params missing, go back to login
      router.push("/auth/login");
    }
  }, [sessionToken, identifier, identifierType, router]);

  const verifyLoginMutation = useMutation({
    mutationFn: authApi.verifyLogin,
    onSuccess: async (data) => {
      toast.success("Login successful!");

      // Update store
      const user = getUserFromToken(data.accessToken);
      if (user?.sub) {
        // Fetch full user profile to ensure all properties are present
        await fetchUser();
        
        // Redirect to dashboard
        toast.info("Redirecting to dashboard...");
        router.push(`/dashboard/${user.sub}`);
      } else {
        toast.error("Authentication error. Please login again.");
        router.push("/auth/login");
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Invalid OTP. Please try again.");
      setOtp(""); // Clear OTP on error
    },
  });

  const resendMutation = useMutation({
    mutationFn: authApi.resendLoginOtp,
    onSuccess: (data) => {
      setExpiresAt(data.expiresAt);
      setOtpExpired(false);
      toast.success("New OTP sent!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to resend OTP: ${error.message}`);
    },
  });

  const handleVerify = (code: string) => {
    if (!sessionToken || code.length !== 6 || !identifierType) return;

    verifyLoginMutation.mutate({
      sessionToken,
      [identifierType]: identifier,
      identifierType,
      code,
    });
  };

  const handleResend = () => {
    if (!sessionToken || !identifier || !identifierType) return;

    resendMutation.mutate({
      sessionToken,
      identifierType,
      identifier: identifier!,
    });
  };

  const handleExpiry = () => {
    setOtpExpired(true);
  };

  if (!identifierType) return null;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-linear-to-br from-background via-background to-muted/30">
      {/* Animated Background Elements - matching verify page */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse delay-700" />
      </div>

      <Card className="w-full max-w-md relative backdrop-blur">
        <CardHeader className="space-y-4">
          <div className="space-y-2 text-center">
            <CardTitle className="text-2xl">Enter Verification Code</CardTitle>
            <CardDescription>
              We&apos;ve sent a code to your {identifierType}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex flex-col items-center justify-center space-y-2 text-center">
              <div className="p-3 bg-primary/10 rounded-full text-primary ring-1 ring-primary/20">
                {identifierType === "email" ? (
                  <Mail className="w-6 h-6" />
                ) : (
                  <Phone className="w-6 h-6" />
                )}
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-lg">
                  Check your {identifierType}
                </h3>
                <p className="text-sm text-muted-foreground">
                  We&apos;ve sent a 6-digit code to{" "}
                  <span className="font-medium text-foreground">
                    {identifier}
                  </span>
                </p>
              </div>
            </div>

            {/* Timer */}
            <div className="flex justify-center">
              <OtpTimer expiresAt={expiresAt} onExpiry={handleExpiry} />
            </div>

            <div className="flex justify-center py-4">
              <InputOTP
                maxLength={6}
                value={otp}
                onChange={(value) => {
                  setOtp(value);
                  if (value.length === 6) {
                    handleVerify(value);
                  }
                }}
                disabled={verifyLoginMutation.isPending || otpExpired}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>

            <div className="space-y-3">
              <Button
                className="w-full"
                onClick={() => handleVerify(otp)}
                disabled={
                  verifyLoginMutation.isPending ||
                  otp.length !== 6 ||
                  otpExpired
                }
              >
                {verifyLoginMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    Verify & Login <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                className="w-full"
                onClick={handleResend}
                disabled={!otpExpired || resendMutation.isPending}
              >
                {resendMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Resend Code
                  </>
                )}
              </Button>

              <Button
                variant="ghost"
                className="w-full"
                onClick={() => router.push("/auth/login")}
              >
                Back to Login
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Wrap in Suspense to satisfy Next.js build requirements
export default function LoginVerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading verification...</p>
          </div>
        </div>
      }
    >
      <LoginVerifyPageContent />
    </Suspense>
  );
}
