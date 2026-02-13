import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  AxiosError,
} from "axios";
import { ApiError } from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const DEFAULT_TIMEOUT = 30000; // 30 seconds

interface ErrorResponse {
  message?: string;
  error?: string;
  statusCode?: number;
}

export class HttpClient {
  private axiosInstance: AxiosInstance;

  constructor(baseUrl: string = API_BASE_URL) {
    this.axiosInstance = axios.create({
      baseURL: baseUrl,
      timeout: DEFAULT_TIMEOUT,
      withCredentials: true, // Enable sending cookies with requests
      headers: {
        "Content-Type": "application/json",
      },
    });

    this.setupInterceptors();
  }

  private isRefreshing = false;
  private refreshSubscribers: Array<(token: string) => void> = [];

  private setupInterceptors(): void {
    // Request interceptor
    this.axiosInstance.interceptors.request.use(
      (config) => {
        // Add authentication token if available (will be handled by cookies for same-origin)
        // This is mainly for manual override if needed
        const token = this.getAuthToken();
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      },
    );

    // Response interceptor with token refresh logic
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error: AxiosError<ErrorResponse>) => {
        const originalRequest = error.config as AxiosRequestConfig & {
          _retry?: boolean;
        };

        // Handle 401 Unauthorized errors
        if (error.response?.status === 401 && !originalRequest._retry) {
          // Check if we have a refresh token
          const refreshToken = this.getRefreshToken();

          if (!refreshToken) {
            // No refresh token - redirect to login
            this.redirectToLogin();
            return Promise.reject(this.handleError(error));
          }

          // Prevent infinite refresh loops
          if (originalRequest.url?.includes("/auth/refresh")) {
            // Refresh endpoint itself failed - clear cookies and redirect
            this.clearAuthCookies();
            this.redirectToLogin();
            return Promise.reject(this.handleError(error));
          }

          originalRequest._retry = true;

          if (!this.isRefreshing) {
            this.isRefreshing = true;

            try {
              // Attempt to refresh the token
              const response = await this.axiosInstance.post<{
                accessToken: string;
                refreshToken: string;
              }>("/auth/refresh", { refreshToken });

              const { accessToken } = response.data;

              // Token refreshed successfully
              this.isRefreshing = false;
              this.onRefreshed(accessToken);
              this.refreshSubscribers = [];

              // Retry the original request with new token
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${accessToken}`;
              }
              return this.axiosInstance(originalRequest);
            } catch {
              // Refresh failed - clear everything and redirect
              this.isRefreshing = false;
              this.refreshSubscribers = [];
              this.clearAuthCookies();
              this.redirectToLogin();
              return Promise.reject(this.handleError(error));
            }
          }

          // If already refreshing, queue this request
          return new Promise((resolve) => {
            this.refreshSubscribers.push((token: string) => {
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
              }
              resolve(this.axiosInstance(originalRequest));
            });
          });
        }

        return Promise.reject(this.handleError(error));
      },
    );
  }

  private onRefreshed(token: string): void {
    this.refreshSubscribers.forEach((callback) => callback(token));
  }

  private redirectToLogin(): void {
    // Only redirect if we're in a browser environment
    if (typeof window !== "undefined") {
      const currentPath = window.location.pathname;
      const loginUrl = `/auth/login${currentPath !== "/" ? `?callbackUrl=${encodeURIComponent(currentPath)}` : ""}`;
      window.location.href = loginUrl;
    }
  }

  private clearAuthCookies(): void {
    if (typeof document !== "undefined") {
      // Clear auth cookies
      document.cookie =
        "accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
      document.cookie =
        "token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
      document.cookie =
        "refreshToken=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
    }
  }

  private getAuthToken(): string | null {
    // Tokens are handled via httpOnly cookies
    // This is only for manual override if needed
    return null;
  }

  private getRefreshToken(): string | null {
    if (typeof document === "undefined") return null;

    const cookies = document.cookie.split(";");
    const refreshTokenCookie = cookies.find((cookie) =>
      cookie.trim().startsWith("refreshToken="),
    );

    if (!refreshTokenCookie) return null;

    return refreshTokenCookie.split("=")[1];
  }

  private handleError(error: AxiosError<ErrorResponse>): ApiError {
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;
      const message =
        data?.message ||
        data?.error ||
        error.message ||
        `HTTP ${status}: ${error.response.statusText}`;

      return new ApiError(message, status);
    }

    if (error.request) {
      // Request made but no response received
      return new ApiError(
        "No response received from server. Please check your network connection.",
        0,
      );
    }

    // Something else happened
    return new ApiError(error.message || "An unexpected error occurred", 500);
  }

  async request<T>(
    endpoint: string,
    options: AxiosRequestConfig = {},
  ): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.axiosInstance.request({
        url: endpoint,
        ...options,
      });
      return response.data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError("An unexpected error occurred", 500);
    }
  }

  async get<T>(endpoint: string, options?: AxiosRequestConfig): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "GET" });
  }

  async post<T>(
    endpoint: string,
    data?: unknown,
    options?: AxiosRequestConfig,
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "POST",
      data,
    });
  }

  async put<T>(
    endpoint: string,
    data?: unknown,
    options?: AxiosRequestConfig,
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "PUT",
      data,
    });
  }

  async patch<T>(
    endpoint: string,
    data?: unknown,
    options?: AxiosRequestConfig,
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "PATCH",
      data,
    });
  }

  async delete<T>(endpoint: string, options?: AxiosRequestConfig): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "DELETE" });
  }

  // Utility method to set auth token
  setAuthToken(token: string): void {
    this.axiosInstance.defaults.headers.common["Authorization"] =
      `Bearer ${token}`;
  }

  // Utility method to remove auth token
  removeAuthToken(): void {
    delete this.axiosInstance.defaults.headers.common["Authorization"];
  }

  // Utility method to update base URL
  setBaseURL(baseUrl: string): void {
    this.axiosInstance.defaults.baseURL = baseUrl;
  }
}

export const httpClient = new HttpClient();
