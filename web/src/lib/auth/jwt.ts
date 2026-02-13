import { jwtDecode } from "jwt-decode";

interface JWTPayload {
  sub: string; // user ID
  userType: "student" | "working_professional" | "team_manager";
  email: string;
  onboardingCompleted: boolean;
  exp: number;
}

/**
 * Decodes JWT token and extracts user information
 */
export function getUserFromToken(token: string): JWTPayload | null {
  try {
    return jwtDecode<JWTPayload>(token);
  } catch (error) {
    console.error("Failed to decode JWT token:", error);
    return null;
  }
}

/**
 * Retrieves JWT token from browser cookies
 * Checks both 'accessToken' and 'token' cookie names
 */
export function getTokenFromCookies(): string | null {
  if (typeof document === "undefined") return null;

  const cookies = document.cookie.split("; ");
  const tokenCookie = cookies.find(
    (c) => c.startsWith("accessToken=") || c.startsWith("token="),
  );

  return tokenCookie?.split("=")[1] || null;
}

/**
 * Checks if the current user is a team manager
 */
export function isTeamManager(token: string | null): boolean {
  if (!token) return false;
  const user = getUserFromToken(token);
  return user?.userType === "team_manager";
}
