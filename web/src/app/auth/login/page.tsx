"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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

type IdentifierType = "email" | "phone";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read callback URL from query params (from middleware redirect)
  const callbackUrl = searchParams.get("callbackUrl");
  const [identifierType, setIdentifierType] = useState<IdentifierType>("email");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [countryCode, setCountryCode] = useState(DEFAULT_COUNTRY_CODE);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);


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

      // User is verified - proceed with login OTP on separate page
      const destination = identifierType === "email" ? "email" : "phone";
      const identifier = identifierType === "email" ? email : `${countryCode}${phoneNumber}`;
      
      toast.success(`OTP sent to your ${destination}`);
      
      // Redirect to login verification page
      const params = new URLSearchParams({
        session: data.sessionToken!,
        identifier: identifier,
        type: identifierType,
      });
      
      if (callbackUrl) {
        params.append("callbackUrl", callbackUrl);
      }
      
      router.push(`/auth/login/verify?${params.toString()}`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Invalid credentials. Please try again.");
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

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md border-border/50 bg-card/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold tracking-tight">
            Welcome back
          </CardTitle>
          <CardDescription>
            Sign in with your email or phone number
          </CardDescription>
        </CardHeader>
        <CardContent>
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
                  disabled={loginMutation.isPending}
                />
              </TabsContent>

              <TabsContent value="phone" className="mt-4 space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="flex gap-2">
                  <Select
                    value={countryCode}
                    onValueChange={setCountryCode}
                    disabled={loginMutation.isPending}
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
                    disabled={loginMutation.isPending}
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
                  disabled={loginMutation.isPending}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loginMutation.isPending}
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
            <Button variant="outline" disabled={loginMutation.isPending}>
              Github
            </Button>
            <Button variant="outline" disabled={loginMutation.isPending}>
              Google
            </Button>
          </div>
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
