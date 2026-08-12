import { create } from "zustand";
import api from "@/lib/api";
import type { User } from "@/types";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, platform?: string) => Promise<User>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  updateUser: (updatedUser: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email: string, password: string, platform?: string) => {
    const queryParam = platform ? `?platform=${encodeURIComponent(platform)}` : "?platform=auto";
    const res = await api.post(`/auth/login${queryParam}`, { email, password });
    const { access_token, refresh_token, user, first_login, force_password_change } = res.data;
    localStorage.setItem("access_token", access_token);
    localStorage.setItem("refresh_token", refresh_token);
    if (user?.company_id) localStorage.setItem("company_id", user.company_id);
    const userWithFlags = {
      ...user,
      first_login: first_login !== undefined ? first_login : !user?.first_login_completed,
      force_password_change: force_password_change ?? user?.force_password_change ?? false,
    };
    set({ user: userWithFlags, isAuthenticated: true, isLoading: false });
    return userWithFlags;
  },

  updateUser: (updatedUser: Partial<User>) => {
    set((state) => ({
      user: state.user ? { ...state.user, ...updatedUser } : null,
    }));
  },

  logout: async () => {
    try { await api.post("/auth/logout"); } catch {}
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("company_id");
    localStorage.removeItem("dla_face_registered");
    set({ user: null, isAuthenticated: false, isLoading: false });
  },

  loadUser: async () => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
      if (!token) { 
        set({ user: null, isAuthenticated: false, isLoading: false }); 
        return; 
      }
      const res = await api.get("/auth/me");
      const fullUser = res.data as User;
      // Preserve company_id in localStorage for dashboard calls
      if (fullUser?.company_id) localStorage.setItem("company_id", fullUser.company_id);
      set({ user: fullUser, isAuthenticated: true, isLoading: false });
    } catch (err: any) {
      // Only wipe session if server explicitly returned 401 Unauthorized
      const status = err?.response?.status;
      if (status === 401) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        set({ user: null, isAuthenticated: false, isLoading: false });
      } else {
        // Transient network glitch or server reboot — preserve state without wiping token
        set({ isLoading: false });
      }
    }
  },
}));

