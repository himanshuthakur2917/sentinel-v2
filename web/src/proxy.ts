import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Define the array of allowed routes (public routes)
const publicRoutes = [
  "/",
  "/auth/login",
  "/auth/register",
  "/auth/verify",
  "/onboarding",
];

// Auth routes that authenticated users should not access
const authRoutes = ["/auth/login", "/auth/register"];

/**
 * Decode JWT token to extract user ID and onboarding status
 * This is a simplified version that doesn't verify the signature
 * since we're just reading the payload for routing purposes
 */
function getUserDataFromToken(token: string): {
  userId: string | null;
  onboardingCompleted: boolean;
} {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return { userId: null, onboardingCompleted: false };

    const payload = JSON.parse(atob(parts[1]));
    return {
      userId: payload.sub || null,
      onboardingCompleted: payload.onboardingCompleted ?? false,
    };
  } catch {
    return { userId: null, onboardingCompleted: false };
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static files and API routes handled by the matcher check
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/static") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Check for authorized token in cookies
  const token =
    request.cookies.get("accessToken")?.value ||
    request.cookies.get("token")?.value;

  // Check if user is trying to access auth routes while already authenticated
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  if (isAuthRoute && token) {
    // User is authenticated and trying to access login/register
    const { userId, onboardingCompleted } = getUserDataFromToken(token);

    if (userId) {
      // Check if onboarding is completed
      if (!onboardingCompleted) {
        // Redirect to onboarding if not completed
        const onboardingUrl = new URL("/onboarding", request.url);
        return NextResponse.redirect(onboardingUrl);
      } else {
        // Redirect to dashboard if onboarding is completed
        const dashboardUrl = new URL(`/dashboard/${userId}`, request.url);
        return NextResponse.redirect(dashboardUrl);
      }
    } else {
      // If we can't extract user ID, redirect to generic dashboard
      const dashboardUrl = new URL("/dashboard", request.url);
      return NextResponse.redirect(dashboardUrl);
    }
  }

  // Check if the current route matches any of the public routes
  const isPublicRoute = publicRoutes.some((route) => {
    // Exact match for root
    if (route === "/") {
      return pathname === route;
    }
    // Starts with for other routes (e.g. /auth/login/subdir)
    return pathname.startsWith(route);
  });

  if (isPublicRoute) {
    return NextResponse.next();
  }

  // For protected routes (like dashboard), check authentication and onboarding
  if (!token) {
    // Redirect to login page if not authorized
    const loginUrl = new URL("/auth/login", request.url);
    // Preserve the original URL to redirect back after login if needed
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // User has token, check if onboarding is completed for dashboard access
  const { userId, onboardingCompleted } = getUserDataFromToken(token);

  // If trying to access dashboard without completing onboarding, redirect to onboarding
  if (pathname.startsWith("/dashboard") && !onboardingCompleted) {
    const onboardingUrl = new URL("/onboarding", request.url);
    return NextResponse.redirect(onboardingUrl);
  }

  return NextResponse.next();
}

// Configuration for the middleware matcher
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
