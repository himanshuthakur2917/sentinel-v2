import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { authApi } from "@/lib/api/auth.api";
import { CurrentUser } from "@/lib/api/types";

const mapUser = (apiUser: CurrentUser): User => ({
  id: apiUser.id,
  email: apiUser.email,
  fullName: apiUser.full_name,
  userName: apiUser.user_name,
  profilePictureUrl: apiUser.profile_picture_url,
  userType: apiUser.user_type,
  onboardingCompleted: apiUser.onboarding_completed,
});

interface User {
  id: string;
  email: string;
  fullName: string;
  userName: string;
  profilePictureUrl?: string;
  userType: "student" | "working_professional" | "team_manager";
  onboardingCompleted: boolean;
}

interface AuthState {
  // State
  user: User | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  refreshUser: () => Promise<void>;
  fetchUser: () => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    (set) => ({
      // Initial state
      user: null,
      isLoading: false,
      error: null,

      // Refresh user - now fetches from API
      refreshUser: async () => {
        try {
          const apiUser = await authApi.getMe();
          console.log("store :", apiUser);
          set({ user: mapUser(apiUser), error: null });
        } catch (error) {
          console.error("Failed to refresh user:", error);
          set({ user: null, error: "Failed to refresh user" });
        }
      },

      // Fetch user explicitly
      fetchUser: async () => {
        set({ isLoading: true });
        try {
          const apiUser = await authApi.getMe();
          set({ user: mapUser(apiUser), isLoading: false, error: null });
        } catch (error) {
          set({ user: null, isLoading: false, error: "Failed to fetch user" });
        }
      },

      // Logout - call API and clear state
      logout: async () => {
        try {
          await authApi.logout(""); // Access token handled by cookie
        } catch (error) {
          console.error("Logout failed:", error);
        }
        set({ user: null, error: null });
      },

      // Clear error
      clearError: () => {
        set({ error: null });
      },

      // Set user directly (for after login/register)
      setUser: (user: User | null) => {
        set({ user, error: null });
      },
    }),
    { name: "AuthStore" },
  ),
);

// Selectors for optimized subscriptions
export const selectUser = (state: AuthState) => state.user;
export const selectIsAuthenticated = (state: AuthState) => !!state.user;
export const selectIsLoading = (state: AuthState) => state.isLoading;
export const selectError = (state: AuthState) => state.error;
export const selectOnboardingCompleted = (state: AuthState) =>
  state.user?.onboardingCompleted ?? false;
export const selectIsTeamManager = (state: AuthState) =>
  state.user?.userType === "team_manager";
