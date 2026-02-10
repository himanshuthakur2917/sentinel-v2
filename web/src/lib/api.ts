/**
 * API Client for Sentinel Backend
 * Handles all HTTP requests to the NestJS backend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const config: RequestInit = {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const error = await response.json().catch(() => ({
          message: response.statusText,
        }));
        throw new Error(
          error.message || `HTTP ${response.status}: ${response.statusText}`,
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("An unexpected error occurred");
    }
  }

  // Auth endpoints
  async register(data: {
    email: string;
    phone: string;
    password: string;
  }): Promise<{ sessionToken: string; passwordHash: string }> {
    return this.request("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async verifyOtp(data: {
    sessionToken: string;
    identifier: string;
    identifierType: "email" | "phone";
    code: string;
  }): Promise<{ verified: boolean; fullyVerified: boolean }> {
    return this.request("/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async login(data: {
    email?: string;
    phone?: string;
    password: string;
  }): Promise<{
    sessionToken: string;
    identifier: string;
    type: "email" | "phone";
  }> {
    return this.request("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async verifyLogin(data: {
    sessionToken: string;
    email?: string;
    phone?: string;
    identifierType: "email" | "phone";
    code: string;
  }): Promise<{ accessToken: string; refreshToken: string }> {
    return this.request("/auth/login/verify", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async completeOnboarding(data: {
    sessionToken: string;
    userName: string;
    userType: "student" | "working_professional" | "team_manager";
    country: string;
    timezone: string;
    theme?: "light" | "dark" | "system";
    language?: "en" | "hi";
    passwordHash: string;
  }): Promise<{ accessToken: string; refreshToken: string }> {
    return this.request("/auth/onboarding", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async refreshToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    return this.request("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    });
  }

  async logout(accessToken: string): Promise<{ message: string }> {
    return this.request("/auth/logout", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  }

  async getCurrentUser(accessToken: string): Promise<{
    sub: string;
    email: string;
    phone: string;
    userType: string;
  }> {
    return this.request("/auth/me", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  }
}

// Export singleton instance
export const api = new ApiClient();

// Export types
export type { ApiResponse };
