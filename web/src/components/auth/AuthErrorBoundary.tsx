"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { useRouter } from "next/navigation";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary for Authentication Pages
 * Catches errors during authentication flow and provides recovery options
 */
export class AuthErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to console in development
    console.error("Auth Error Boundary caught an error:", error, errorInfo);

    // In production, you might want to log to an error reporting service
    // e.g., Sentry, LogRocket, etc.
  }

  render() {
    if (this.state.hasError) {
      return <AuthErrorFallback error={this.state.error} />;
    }

    return this.props.children;
  }
}

/**
 * Fallback UI component shown when an error occurs
 */
function AuthErrorFallback({ error }: { error: Error | null }) {
  const router = useRouter();

  const handleRetry = () => {
    window.location.reload();
  };

  const handleGoHome = () => {
    router.push("/");
  };

  const handleGoToLogin = () => {
    router.push("/auth/login");
  };

  const isTokenError =
    error?.message?.toLowerCase().includes("token") ||
    error?.message?.toLowerCase().includes("unauthorized") ||
    error?.message?.toLowerCase().includes("authentication");

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted/30">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto p-4 bg-destructive/10 rounded-full text-destructive w-fit">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-2xl">
              {isTokenError ? "Authentication Error" : "Something went wrong"}
            </CardTitle>
            <CardDescription>
              {isTokenError
                ? "Your session may have expired. Please try logging in again."
                : "We encountered an unexpected error. Please try again."}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Error details (development only) */}
          {process.env.NODE_ENV === "development" && error && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs font-mono text-muted-foreground break-all">
                {error.message}
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-2">
            <Button onClick={handleRetry} className="w-full" variant="default">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>

            {isTokenError ? (
              <Button
                onClick={handleGoToLogin}
                className="w-full"
                variant="outline"
              >
                Go to Login
              </Button>
            ) : (
              <Button
                onClick={handleGoHome}
                className="w-full"
                variant="outline"
              >
                <Home className="mr-2 h-4 w-4" />
                Go to Home
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
