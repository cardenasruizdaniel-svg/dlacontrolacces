"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";

const INACTIVITY_LIMIT_MS = 20 * 60 * 1000; // 20 Minutes
const STORAGE_KEY = "dla_last_activity_ts";
const CHECK_INTERVAL_MS = 10000; // Check every 10 seconds
const THROTTLE_MS = 5000; // Throttle activity updates every 5 seconds

export function useInactivityLogout(isEnabled: boolean = true) {
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const lastUpdateRef = useRef<number>(Date.now());

  // Check if current user is Super Admin (exempt from 20-minute auto-logout rule)
  const isSuperAdmin = Boolean(user?.is_superuser) ||
    (typeof user?.role === "string" && (user.role as string).toLowerCase().includes("super")) ||
    (typeof user?.role === "object" && Boolean((user.role as any)?.name?.toLowerCase().includes("super"))) ||
    user?.email?.toLowerCase() === "admin@dlaredes.com.co" ||
    (user as any)?.username?.toLowerCase() === "admin";

  useEffect(() => {
    // Exclude SuperAdmin from auto-logout so they can keep the session open indefinitely
    if (!isEnabled || !isAuthenticated || isSuperAdmin || typeof window === "undefined") return;

    // Set initial activity timestamp if not set
    const initTs = Date.now();
    localStorage.setItem(STORAGE_KEY, String(initTs));
    lastUpdateRef.current = initTs;

    const recordActivity = () => {
      const now = Date.now();
      if (now - lastUpdateRef.current > THROTTLE_MS) {
        lastUpdateRef.current = now;
        try {
          localStorage.setItem(STORAGE_KEY, String(now));
        } catch {}
      }
    };

    const activityEvents = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"];
    activityEvents.forEach((evt) => {
      window.addEventListener(evt, recordActivity, { passive: true });
    });

    const checkInactivity = () => {
      try {
        const storedTs = localStorage.getItem(STORAGE_KEY);
        const lastTs = storedTs ? parseInt(storedTs, 10) : lastUpdateRef.current;
        const elapsed = Date.now() - lastTs;

        if (elapsed >= INACTIVITY_LIMIT_MS) {
          console.warn(`[Auto-Logout] Inactividad de 20 minutos detectada (${Math.round(elapsed / 1000)}s). Cerrando sesión.`);
          logout();
          localStorage.removeItem(STORAGE_KEY);
          router.push("/login?reason=inactivity");
        }
      } catch (err) {
        console.error("Error al verificar inactividad:", err);
      }
    };

    const intervalId = setInterval(checkInactivity, CHECK_INTERVAL_MS);

    return () => {
      activityEvents.forEach((evt) => {
        window.removeEventListener(evt, recordActivity);
      });
      clearInterval(intervalId);
    };
  }, [isEnabled, isAuthenticated, isSuperAdmin, logout, router]);
}
