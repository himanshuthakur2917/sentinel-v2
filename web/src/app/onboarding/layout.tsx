import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Onboarding | Sentinel",
  description: "Complete your profile setup",
};

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
