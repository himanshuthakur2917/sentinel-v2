import { Metadata } from "next";
import { AuthErrorBoundary } from "@/components/auth/AuthErrorBoundary";

export const metadata: Metadata = {
  title: "Authentication | Sentinel",
  description: "Sign in or create an account",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthErrorBoundary>{children}</AuthErrorBoundary>;
}
