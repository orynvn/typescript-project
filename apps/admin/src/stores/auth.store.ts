import { create } from 'zustand';
import { api } from '@/lib/api';
import type { User } from '@/types';

type AuthState = {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setAccessToken: (token: string | null) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
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
      set({ accessToken: payload.accessToken, isAuthenticated: true });
      const meResponse = await api.get('/auth/me');
      const user = meResponse.data?.data ?? meResponse.data;
      set({ user, isLoading: false });
    } catch (error) {
      set({ isLoading: false, isAuthenticated: false, accessToken: null, user: null });
      throw error;
    }
  },
  logout: async () => {
    set({ user: null, accessToken: null, isAuthenticated: false });
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
