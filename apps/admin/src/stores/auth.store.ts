import { create } from 'zustand';
import { api } from '@/lib/api';
import type { User } from '@/types';

type AuthState = {
  user: User | null;
  accessToken: string | null;
  pendingTwoFactorToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setAccessToken: (token: string | null) => void;
  login: (email: string, password: string) => Promise<{ requiresTwoFactor: boolean }>;
  validateTwoFactor: (code: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  pendingTwoFactorToken: null,
  isAuthenticated: false,
  isLoading: false,
  setUser: (user) => set({ user, isAuthenticated: Boolean(user) }),
  setAccessToken: (token) =>
    set({ accessToken: token, isAuthenticated: Boolean(token || get().user) }),
  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const response = await api.post('/auth/login', { email, password });
      const payload = response.data?.data ?? response.data;
      if (payload.requiresTwoFactor && payload.tempToken) {
        set({
          pendingTwoFactorToken: payload.tempToken,
          isAuthenticated: false,
          accessToken: null,
          user: null,
          isLoading: false,
        });
        return { requiresTwoFactor: true };
      }
      set({ accessToken: payload.accessToken, isAuthenticated: true });
      const meResponse = await api.get('/auth/me');
      const user = meResponse.data?.data ?? meResponse.data;
      set({ user, isLoading: false, pendingTwoFactorToken: null });
      return { requiresTwoFactor: false };
    } catch (error) {
      set({
        isLoading: false,
        isAuthenticated: false,
        accessToken: null,
        user: null,
        pendingTwoFactorToken: null,
      });
      throw error;
    }
  },
  validateTwoFactor: async (code) => {
    const tempToken = get().pendingTwoFactorToken;
    if (!tempToken) {
      throw new Error('Two-factor session expired. Please login again.');
    }
    set({ isLoading: true });
    try {
      const response = await api.post('/auth/2fa/validate', { tempToken, code });
      const payload = response.data?.data ?? response.data;
      set({ accessToken: payload.accessToken, isAuthenticated: true, pendingTwoFactorToken: null });
      const meResponse = await api.get('/auth/me');
      const user = meResponse.data?.data ?? meResponse.data;
      set({ user, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },
  logout: async () => {
    set({ user: null, accessToken: null, pendingTwoFactorToken: null, isAuthenticated: false });
  },
  refreshToken: async () => {
    try {
      const response = await api.post('/auth/refresh');
      const payload = response.data?.data ?? response.data;
      set({ accessToken: payload.accessToken, isAuthenticated: true });
      return true;
    } catch {
      set({ user: null, accessToken: null, isAuthenticated: false });
      return false;
    }
  },
}));
