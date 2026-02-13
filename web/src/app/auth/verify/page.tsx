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
  CheckCircle2,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { OtpTimer } from "@/components/auth/OtpTimer";
import { StageIndicator } from "@/components/auth/StageIndicator";
import { ApiError } from "@/lib/api";

type VerifyStep = "email" | "phone" | "complete";

function VerifyPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email");
  const phone = searchParams.get("phone");
  const sessionToken = searchParams.get("session");
  const userId = searchParams.get("userId");
  const fromLogin = searchParams.get("fromLogin") === "true";
  const initialExpiresAt = searchParams.get("expiresAt");

  // Verification state
  const [currentStep, setCurrentStep] = useState<VerificationStep>("email");
  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [emailOtp, setEmailOtp] = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");

  // Timer state - server-synced expiry
  const [expiresAt, setExpiresAt] = useState<string>(
    () =>
      initialExpiresAt || new Date(Date.now() + 5 * 60 * 1000).toISOString(),
  );
  const [otpExpired, setOtpExpired] = useState(false);

  // Initialize step based on what's needed
  useEffect(() => {
    if (!email || !phone || !sessionToken) {
      if (!email && !phone) router.push("/auth/register");
      return;
    }

    if (emailVerified && !phoneVerified) {
      setCurrentStep("phone");
    } else if (emailVerified && phoneVerified) {
      setCurrentStep("complete");
    }
  }, [email, phone, sessionToken, router, emailVerified, phoneVerified]);

  const verifyMutation = useMutation({
    mutationFn: authApi.verifyOtp,
    onSuccess: async (data, variables) => {
      if (variables.identifierType === "email") {
        setEmailVerified(true);
        toast.success("Email verified successfully");
        setCurrentStep("phone");
      } else {
        setPhoneVerified(true);
        toast.success("Phone verified successfully");
        setCurrentStep("complete");

        // Final completion logic - check if fully verified
        if (data.fullyVerified) {
          setTimeout(async () => {
            // If coming from login, auto-login after verification
            if (fromLogin && userId) {
              try {
                const tokens =
                  await authApi.completeLoginAfterVerification(userId);
                localStorage.setItem("accessToken", tokens.accessToken);
                localStorage.setItem("refreshToken", tokens.refreshToken);
                toast.success("Verification complete! Logging you in...");
                router.push("/dashboard");
              } catch (error) {
                toast.error("Failed to login. Please try again.");
                router.push("/auth/login");
              }
            } else {
              // Coming from registration - proceed to onboarding
              const params = new URLSearchParams({
                session: sessionToken!,
              });
              router.push(`/onboarding?${params.toString()}`);
            }
          }, 1000);
        }
      }
    },
    onError: (error: Error, variables) => {
      const type = variables.identifierType === "email" ? "Email" : "Phone";
      toast.error(`${type} verification failed: ${error.message}`);
      if (error instanceof ApiError && error.statusCode === 401) {
        // Stay on page for retry
        // router.back();
      }
      // Reset OTP on error for better UX
      if (variables.identifierType === "email") {
        setEmailOtp("");
      } else {
        setPhoneOtp("");
      }
    },
  });

  const resendMutation = useMutation({
    mutationFn: authApi.resendRegistrationOtp,
    onSuccess: (data) => {
      // Update timer with new expiry timestamp
      setExpiresAt(data.expiresAt);
      setOtpExpired(false);
      toast.success("New OTP sent!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to resend OTP: ${error.message}`);
      if (error instanceof ApiError && error.statusCode === 401) {
        // Stay on page for retry
        // router.back();
      }
    },
  });

  const handleVerify = (type: "email" | "phone", code: string) => {
    if (!sessionToken || code.length !== 6) return;

    verifyMutation.mutate({
      sessionToken,
      identifier: type === "email" ? email! : phone!,
      identifierType: type,
      code,
    });
  };

  const handleResend = () => {
    if (!sessionToken) return;

    const identifierType = currentStep === "email" ? "email" : "phone";
    resendMutation.mutate({
      sessionToken,
      identifierType,
      identifier: identifierType === "email" ? email! : phone!,
    });
  };

  const handleExpiry = () => {
    setOtpExpired(true);
  };

  const renderStep = () => {
    switch (currentStep) {
      case "email":
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex flex-col items-center justify-center space-y-2 text-center">
              <div className="p-3 bg-primary/10 rounded-full text-primary ring-1 ring-primary/20">
                <Mail className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-lg">Check your email</h3>
                <p className="text-sm text-muted-foreground">
                  We've sent a 6-digit code to{" "}
                  <span className="font-medium text-foreground">{email}</span>
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
                value={emailOtp}
                onChange={(value) => {
                  setEmailOtp(value);
                  if (value.length === 6) {
                    handleVerify("email", value);
                  }
                }}
                disabled={verifyMutation.isPending || otpExpired}
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
                onClick={() => handleVerify("email", emailOtp)}
                disabled={
                  verifyMutation.isPending ||
                  emailOtp.length !== 6 ||
                  otpExpired
                }
              >
                {verifyMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    Continue <ArrowRight className="ml-2 h-4 w-4" />
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
            </div>
          </div>
        );

      case "phone":
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex flex-col items-center justify-center space-y-2 text-center">
              <div className="p-3 bg-primary/10 rounded-full text-primary ring-1 ring-primary/20">
                <Phone className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-lg">Check your phone</h3>
                <p className="text-sm text-muted-foreground">
                  We've sent a 6-digit code to{" "}
                  <span className="font-medium text-foreground">{phone}</span>
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
                value={phoneOtp}
                onChange={(value) => {
                  setPhoneOtp(value);
                  if (value.length === 6) {
                    handleVerify("phone", value);
                  }
                }}
                disabled={verifyMutation.isPending || otpExpired}
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
                onClick={() => handleVerify("phone", phoneOtp)}
                disabled={
                  verifyMutation.isPending ||
                  phoneOtp.length !== 6 ||
                  otpExpired
                }
              >
                {verifyMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    Continue <ArrowRight className="ml-2 h-4 w-4" />
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
            </div>
          </div>
        );

      case "complete":
        return (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="p-4 bg-green-500/10 rounded-full text-green-500 ring-1 ring-green-500/20 animate-pulse">
                <CheckCircle2 className="w-12 h-12" />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-2xl">All verified!</h3>
                <p className="text-sm text-muted-foreground">
                  Your email and phone are now verified.
                  <br />
                  Redirecting to onboarding...
                </p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-background via-background to-muted/30">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse delay-700" />
      </div>

      <Card className="w-full max-w-md relative backdrop-blur">
        <CardHeader className="space-y-4">
          <div className="space-y-2 text-center">
            <CardTitle className="text-2xl">Verify Your Account</CardTitle>
            <CardDescription>
              Please verify both your email and phone number to continue
            </CardDescription>
          </div>

          {/* Stage Indicator */}
          <StageIndicator
            currentStage={currentStep}
            emailVerified={emailVerified}
            phoneVerified={phoneVerified}
          />
        </CardHeader>

        <CardContent>{renderStep()}</CardContent>
      </Card>
    </div>
  );
}

// Wrap in Suspense to satisfy Next.js build requirements
export default function VerifyPage() {
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
      <VerifyPageContent />
    </Suspense>
  );
}
