import { httpClient } from "./client";
import type {
  RegisterRequest,
  VerifyOtpRequest,
  VerifyOtpResponse,
  LoginRequest,
  VerifyLoginRequest,
  AuthTokens,
  OnboardingRequest,
  ResendOtpRequest,
  ResendOtpResponse,
  RegisterResponse,
  LoginResponse,
} from "./types";

export const authApi = {
  /**
   * Register a new user - sends OTP to email and phone
   */
  register: async (data: RegisterRequest): Promise<RegisterResponse> => {
    return httpClient.post<RegisterResponse>("/auth/register", data);
  },

  /**
   * Verify OTP code for email or phone
   */
  verifyOtp: async (data: VerifyOtpRequest): Promise<VerifyOtpResponse> => {
    return httpClient.post<VerifyOtpResponse>("/auth/verify-otp", data);
  },

  /**
   * Login with email/phone and password - sends OTP
   */
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    return httpClient.post<LoginResponse>("/auth/login", data);
  },

  /**
   * Verify login OTP and get tokens
   */
  verifyLogin: async (data: VerifyLoginRequest): Promise<AuthTokens> => {
    return httpClient.post<AuthTokens>("/auth/login/verify", data);
  },

  /**
   * Complete onboarding after OTP verification
   */
  completeOnboarding: async (data: OnboardingRequest): Promise<AuthTokens> => {
    return httpClient.post<AuthTokens>("/auth/onboarding", data);
  },

  /**
   * Refresh access token
   */
  refreshToken: async (refreshToken: string): Promise<AuthTokens> => {
    return httpClient.post<AuthTokens>("/auth/refresh", { refreshToken });
  },

  /**
   * Logout - revoke all tokens
   */
  logout: async (accessToken: string): Promise<{ message: string }> => {
    return httpClient.post<{ message: string }>("/auth/logout", undefined, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  },

  /**
   * Get current user info
   */
  getCurrentUser: async (accessToken: string): Promise<CurrentUser> => {
    return httpClient.post<CurrentUser>("/auth/me", undefined, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  },

  /**
   * Resend OTP during registration verification
   */
  resendRegistrationOtp: async (
    data: ResendOtpRequest,
  ): Promise<ResendOtpResponse> => {
    return httpClient.post<ResendOtpResponse>(
      "/auth/resend-registration-otp",
      data,
    );
  },

  /**
   * Complete login after verification (auto-login)
   */
  completeLoginAfterVerification: async (
    userId: string,
  ): Promise<AuthTokens> => {
    return httpClient.post<AuthTokens>(
      "/auth/complete-login-after-verification",
      { userId },
    );
  },

  /**
   * Resend OTP for a specific identifier type
   */
  resendLoginOtp: async (
    data: ResendOtpRequest,
  ): Promise<ResendOtpResponse> => {
    return httpClient.post<ResendOtpResponse>("/auth/resend-login-otp", data);
  },
};
