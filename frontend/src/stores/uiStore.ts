import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UIState {
  sidebarOpen: boolean;
  theme: "light" | "dark" | "system";
  toggleSidebar: () => void;
  toggleTheme: () => void;
  setTheme: (theme: "light" | "dark" | "system") => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      sidebarOpen: true,
      theme: "dark", // default
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      toggleTheme: () => {
        const current = get().theme;
        const nextTheme = current === "dark" ? "light" : current === "light" ? "system" : "dark";
        get().setTheme(nextTheme);
      },
      setTheme: (newTheme) => {
        set({ theme: newTheme });
        if (typeof window !== "undefined") {
          let activeTheme = newTheme;
          if (newTheme === "system") {
            activeTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
          }
          document.documentElement.classList.toggle("dark", activeTheme === "dark");
        }
      }
    }),
    {
      name: "dla-ui-storage",
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Listen for system changes if mode is system
          if (typeof window !== "undefined") {
            const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
            const handleChange = () => {
              if (useUIStore.getState().theme === "system") {
                useUIStore.getState().setTheme("system");
              }
            };
            mediaQuery.addEventListener("change", handleChange);
            state.setTheme(state.theme);
          }
        }
      }
    }
  )
);
