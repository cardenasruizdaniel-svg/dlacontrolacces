"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";

const INACTIVITY_LIMIT_MS = 15 * 60 * 1000; // 15 Minutes
const STORAGE_KEY = "dla_last_activity_ts";
const CHECK_INTERVAL_MS = 10000; // Check every 10 seconds
const THROTTLE_MS = 5000; // Throttle activity updates every 5 seconds

export function useInactivityLogout(isEnabled: boolean = true) {
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const lastUpdateRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!isEnabled || !isAuthenticated || typeof window === "undefined") return;

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
          console.warn(`[Auto-Logout] Inactividad de 15 minutos detectada (${Math.round(elapsed / 1000)}s). Cerrando sesión.`);
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
  }, [isEnabled, isAuthenticated, logout, router]);
}
