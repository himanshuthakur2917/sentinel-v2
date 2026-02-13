"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, EyeOff, Mail, Phone } from "lucide-react";
import {
  COUNTRY_CODES,
  DEFAULT_COUNTRY_CODE,
} from "@/lib/constants/country-codes";
import { authApi } from "@/lib/api";
import { getUserFromToken } from "@/lib/auth/jwt";
import { useAuthStore } from "@/store/auth.store";

type IdentifierType = "email" | "phone";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser } = useAuthStore();

  // Read callback URL from query params (from middleware redirect)
  const callbackUrl = searchParams.get("callbackUrl");
  const [step, setStep] = useState<"credentials" | "otp">("credentials");
  const [identifierType, setIdentifierType] = useState<IdentifierType>("email");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [countryCode, setCountryCode] = useState(DEFAULT_COUNTRY_CODE);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState("");
  const [sessionToken, setSessionToken] = useState("");
  const [loading, setLoading] = useState(false);

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      // Check if user needs verification (2FA requirement)
      if (data.requiresVerification) {
        toast.warning("Please complete email and phone verification first");
        const params = new URLSearchParams({
          userId: data.userId ?? "",
          session: data.sessionToken ?? "",
          email: data.email ?? "",
          phone: data.phone ?? "",
          fromLogin: "true",
        });
        router.push(`/auth/verify?${params.toString()}`);
        return;
      }

      // User is verified - proceed with login OTP
      setSessionToken(data.sessionToken!);
      setStep("otp");
      const destination = identifierType === "email" ? "email" : "phone";
      toast.success(`OTP sent to your ${destination}`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Invalid credentials. Please try again.");
    },
  });

  const verifyLoginMutation = useMutation({
    mutationFn: authApi.verifyLogin,
    onSuccess: (data) => {
      // Backend sets httpOnly cookies automatically - no localStorage needed!
      toast.success("Login successful!");

      // Extract user info from JWT and update Zustand store
      const user = getUserFromToken(data.accessToken);
      if (user?.sub) {
        setUser({
          id: user.sub,
          email: user.email,
          userType: user.userType,
          onboardingCompleted: user.onboardingCompleted,
        });

        // Handle callback URL redirect
        if (callbackUrl) {
          // Validate callback URL to prevent open redirects
          // Only allow relative URLs starting with /
          if (callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")) {
            router.push(callbackUrl);
            return;
          }
        }

        // Default redirect to dashboard
        router.push(`/dashboard/${user.sub}`);
      } else {
        // If unable to extract user ID, something is wrong - redirect to login
        toast.error("Authentication error. Please login again.");
        router.push("/auth/login");
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Invalid OTP. Please try again.");
    },
  });

  const fullPhoneNumber = `${countryCode}${phoneNumber}`;
  const identifier = identifierType === "email" ? email : fullPhoneNumber;
  const isFormValid =
    identifierType === "email" ? email && password : phoneNumber && password;

  const handleCredentialsSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isFormValid) {
      toast.error(`Please enter your ${identifierType} and password`);
      return;
    }

    loginMutation.mutate({
      [identifierType]: identifier,
      password,
    });
  };

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (otp.length !== 6) {
      toast.error("Please enter a valid 6-digit OTP");
      return;
    }

    verifyLoginMutation.mutate({
      sessionToken,
      [identifierType]: identifier,
      identifierType,
      code: otp,
    });
  };

  const resendOtp = async () => {
    setLoading(true);
    try {
      // TODO: Implement resend OTP API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success("New OTP sent!");
    } catch {
      toast.error("Failed to resend OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md border-border/50 bg-card/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold tracking-tight">
            {step === "credentials" ? "Welcome back" : "Enter OTP"}
          </CardTitle>
          <CardDescription>
            {step === "credentials"
              ? "Sign in with your email or phone number"
              : `We sent a 6-digit code to your ${identifierType}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "credentials" ? (
            <form onSubmit={handleCredentialsSubmit} className="space-y-4">
              <Tabs
                value={identifierType}
                onValueChange={(v) => setIdentifierType(v as IdentifierType)}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger
                    value="email"
                    className="flex items-center gap-2"
                  >
                    <Mail className="h-4 w-4" />
                    Email
                  </TabsTrigger>
                  <TabsTrigger
                    value="phone"
                    className="flex items-center gap-2"
                  >
                    <Phone className="h-4 w-4" />
                    Phone
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="email" className="mt-4 space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                  />
                </TabsContent>

                <TabsContent value="phone" className="mt-4 space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="flex gap-2">
                    <Select
                      value={countryCode}
                      onValueChange={setCountryCode}
                      disabled={loading}
                    >
                      <SelectTrigger className="w-35">
                        <SelectValue placeholder="Code" />
                      </SelectTrigger>
                      <SelectContent className="max-h-75">
                        {COUNTRY_CODES.map((c) => (
                          <SelectItem key={c.code} value={c.code}>
                            <span className="flex items-center gap-2">
                              <span>{c.flag}</span>
                              <span>{c.code}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="9876543210"
                      value={phoneNumber}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, "");
                        setPhoneNumber(value);
                      }}
                      disabled={loading}
                      className="flex-1"
                    />
                  </div>
                </TabsContent>
              </Tabs>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    href="/auth/forgot-password"
                    className="text-xs text-muted-foreground hover:text-primary"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              <Button
                className="w-full"
                type="submit"
                disabled={loginMutation.isPending || !isFormValid}
              >
                {loginMutation.isPending ? "Verifying..." : "Sign In"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleOtpSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp">One-Time Password</Label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="123456"
                  required
                  value={otp}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                    setOtp(value);
                  }}
                  disabled={loading}
                  className="text-center text-lg tracking-widest"
                  maxLength={6}
                />
                <p className="text-xs text-muted-foreground text-center">
                  OTP expires in 90 seconds
                </p>
              </div>

              <Button
                className="w-full"
                type="submit"
                disabled={verifyLoginMutation.isPending || otp.length !== 6}
              >
                {verifyLoginMutation.isPending
                  ? "Verifying..."
                  : "Verify & Sign In"}
              </Button>

              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => {
                    setStep("credentials");
                    setOtp("");
                  }}
                  disabled={loading}
                >
                  Back
                </Button>
                <Button
                  variant="ghost"
                  type="button"
                  onClick={resendOtp}
                  disabled={loading}
                >
                  Resend OTP
                </Button>
              </div>
            </form>
          )}

          {step === "credentials" && (
            <>
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or continue with
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Button variant="outline" disabled={loading}>
                  Github
                </Button>
                <Button variant="outline" disabled={loading}>
                  Google
                </Button>
              </div>
            </>
          )}
        </CardContent>
        <CardFooter>
          <p className="text-center text-sm text-muted-foreground w-full">
            Don&apos;t have an account?{" "}
            <Link
              href="/auth/register"
              className="underline underline-offset-4 hover:text-primary"
            >
              Sign up
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
