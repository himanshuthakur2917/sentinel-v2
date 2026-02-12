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

  // Check for authorized token in cookies
  // We check for 'accessToken' or 'token'
  const token = request.cookies.get("accessToken")?.value || request.cookies.get("token")?.value;

  if (!token) {
    // Redirect to login page if not authorized
    const loginUrl = new URL("/auth/login", request.url);
    // Preserve the original URL to redirect back after login if needed
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
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
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
