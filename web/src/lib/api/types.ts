export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public errors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface RegisterRequest {
  email: string;
  phone: string;
  password: string;
}

export interface RegisterResponse {
  sessionToken: string;
  userId: string;
  expiresAt: string;
}

export interface VerifyOtpRequest {
  sessionToken: string;
  identifier: string;
  identifierType: "email" | "phone";
  code: string;
}

export interface VerifyOtpResponse {
  verified: boolean;
  fullyVerified: boolean;
}

export interface LoginRequest {
  email?: string;
  phone?: string;
  password: string;
}

export interface LoginResponse {
  sessionToken?: string;
  identifier?: string;
  type?: "email" | "phone";
  expiresAt?: string;
  requiresVerification?: boolean;
  userId?: string;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  email?: string;
  phone?: string;
}

export interface VerifyLoginRequest {
  sessionToken: string;
  email?: string;
  phone?: string;
  identifierType: "email" | "phone";
  code: string;
}

export interface OnboardingRequest {
  sessionToken: string;
  userName: string;
  userType: "student" | "working_professional" | "team_manager";
  country: string;
  timezone: string;
  theme?: "light" | "dark" | "system";
  language?: "en" | "hi";
}

export interface UpdateProfileRequest {
  userName: string;
  userType: "student" | "working_professional" | "team_manager";
  country: string;
  timezone: string;
  theme?: "light" | "dark" | "system";
  language?: "en" | "hi";
}

export interface CurrentUser {
  sub: string;
  email: string;
  phone: string;
  userType: string;
}

export interface ResendOtpRequest {
  sessionToken: string;
  identifierType: "email" | "phone";
  identifier: string;
}

export interface ResendOtpResponse {
  success: boolean;
  expiresAt: string;
}
