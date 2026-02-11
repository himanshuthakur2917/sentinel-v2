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
      headers: {
        "Content-Type": "application/json",
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.axiosInstance.interceptors.request.use(
      (config) => {
        // Add authentication token if available
        const token = this.getAuthToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error: AxiosError<ErrorResponse>) => {
        return Promise.reject(this.handleError(error));
      }
    );
  }

  private getAuthToken(): string | null {
    // Implement your token retrieval logic here
    // Example: return localStorage.getItem('authToken');
    return null;
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
        0
      );
    }

    // Something else happened
    return new ApiError(
      error.message || "An unexpected error occurred",
      500
    );
  }

  async request<T>(
    endpoint: string,
    options: AxiosRequestConfig = {}
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

  async get<T>(
    endpoint: string,
    options?: AxiosRequestConfig
  ): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "GET" });
  }

  async post<T>(
    endpoint: string,
    data?: unknown,
    options?: AxiosRequestConfig
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
    options?: AxiosRequestConfig
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
    options?: AxiosRequestConfig
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "PATCH",
      data,
    });
  }

  async delete<T>(
    endpoint: string,
    options?: AxiosRequestConfig
  ): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "DELETE" });
  }

  // Utility method to set auth token
  setAuthToken(token: string): void {
    this.axiosInstance.defaults.headers.common[
      "Authorization"
    ] = `Bearer ${token}`;
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