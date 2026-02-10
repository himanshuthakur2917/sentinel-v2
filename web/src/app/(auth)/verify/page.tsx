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
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function VerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email");
  const phone = searchParams.get("phone");

  const [emailOtp, setEmailOtp] = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!email || !phone) {
      router.push("/auth/register");
    }
  }, [email, phone, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // TODO: Integrate with verify API
    setTimeout(() => {
      setLoading(false);
      toast.success("Verification successful");
      router.push("/onboarding");
    }, 1000);
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
              <Input
                id="email-otp"
                type="text"
                placeholder="123456"
                required
                value={emailOtp}
                onChange={(e) => setEmailOtp(e.target.value)}
                disabled={loading}
                className="text-center tracking-widest"
                maxLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone-otp">Phone Code ({phone})</Label>
              <Input
                id="phone-otp"
                type="text"
                placeholder="123456"
                required
                value={phoneOtp}
                onChange={(e) => setPhoneOtp(e.target.value)}
                disabled={loading}
                className="text-center tracking-widest"
                maxLength={6}
              />
            </div>
            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? "Verifying..." : "Verify & Continue"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
