import { create } from "zustand";
import { persist } from "zustand/middleware";
import { apiClient } from "../services/api";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  plan: string;
  monthlyQuota: number;
  usedQuota: number;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setTokens: (accessToken: string, refreshToken: string) => void;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const response = await apiClient.post("/auth/login", { email, password });
          const { user, accessToken, refreshToken } = response.data.data;
          set({ user, accessToken, refreshToken, isAuthenticated: true, isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (name, email, password) => {
        set({ isLoading: true });
        try {
          const response = await apiClient.post("/auth/register", { name, email, password });
          const { user, accessToken, refreshToken } = response.data.data;
          set({ user, accessToken, refreshToken, isAuthenticated: true, isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        const { refreshToken } = get();
        try {
          await apiClient.post("/auth/logout", { refreshToken });
        } catch {}
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
      },

      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
      updateUser: (userData) => set((s) => ({ user: s.user ? { ...s.user, ...userData } : null })),
    }),
    {
      name: "ig-intel-auth",
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
