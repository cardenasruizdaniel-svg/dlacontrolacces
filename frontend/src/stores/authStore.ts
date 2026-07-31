import { create } from "zustand";
import api from "@/lib/api";
import type { User } from "@/types";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, platform?: string) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email: string, password: string, platform?: string) => {
    const queryParam = platform ? `?platform=${encodeURIComponent(platform)}` : "?platform=auto";
    const res = await api.post(`/auth/login${queryParam}`, { email, password });
    const { access_token, refresh_token, user } = res.data;
    localStorage.setItem("access_token", access_token);
    localStorage.setItem("refresh_token", refresh_token);
    if (user?.company_id) localStorage.setItem("company_id", user.company_id);
    set({ user, isAuthenticated: true });
  },

  logout: async () => {
    try { await api.post("/auth/logout"); } catch {}
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("company_id");
    set({ user: null, isAuthenticated: false });
  },

  loadUser: async () => {
    try {
      const token = localStorage.getItem("access_token");
      if (!token) { set({ isLoading: false }); return; }
      const res = await api.get("/auth/me");
      if (res.data?.company_id) localStorage.setItem("company_id", res.data.company_id);
      set({ user: res.data, isAuthenticated: true, isLoading: false });
    } catch {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      set({ isLoading: false });
    }
  },
}));
