import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { getUserFromToken, getTokenFromCookies } from "@/lib/auth/jwt";

interface User {
  id: string;
  email: string;
  userType: "student" | "working_professional" | "team_manager";
  onboardingCompleted: boolean;
}

interface AuthState {
  // State
  user: User | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  refreshUser: () => void;
  logout: () => void;
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

      // Refresh user from token in cookies
      refreshUser: () => {
        try {
          const token = getTokenFromCookies();
          if (!token) {
            set({ user: null, error: null });
            return;
          }

          const decoded = getUserFromToken(token);
          if (!decoded) {
            set({ user: null, error: "Invalid token" });
            return;
          }

          set({
            user: {
              id: decoded.sub,
              email: decoded.email,
              userType: decoded.userType,
              onboardingCompleted: decoded.onboardingCompleted,
            },
            error: null,
          });
        } catch (error) {
          set({ user: null, error: "Failed to decode token" });
        }
      },

      // Logout - clear user state (cookies cleared by backend)
      logout: () => {
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
