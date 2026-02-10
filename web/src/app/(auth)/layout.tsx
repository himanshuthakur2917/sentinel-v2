import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Authentication | Sentinel",
  description: "Sign in or create an account",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
