"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { getPendingPunches, syncOfflinePunches } from "@/lib/offlineStore";

export function usePWA() {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isInstallable, setIsInstallable] = useState<boolean>(false);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Update pending offline punches count
  const checkPendingPunches = useCallback(async () => {
    try {
      const pending = await getPendingPunches();
      setPendingCount(pending.length);
    } catch {
      setPendingCount(0);
    }
  }, []);

  // Trigger offline synchronization
  const triggerSync = useCallback(async () => {
    if (!navigator.onLine || isSyncing) return;
    setIsSyncing(true);
    try {
      const result = await syncOfflinePunches(api);
      await checkPendingPunches();
      return result;
    } catch (err) {
      console.error("Error en sincronización PWA:", err);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, checkPendingPunches]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check initial online status
    setIsOnline(navigator.onLine);

    // Check standalone mode (installed PWA)
    const isStandaloneMode = window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true;
    setIsStandalone(isStandaloneMode);

    // Register Service Worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("ServiceWorker PWA registrado OK:", reg.scope);
        })
        .catch((err) => {
          console.warn("Fallo al registrar ServiceWorker PWA:", err);
        });

      // Listen for messages from Service Worker
      navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data?.type === "TRIGGER_OFFLINE_SYNC") {
          triggerSync();
        }
      });
    }

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    // Online / Offline Listeners
    const handleOnline = () => {
      setIsOnline(true);
      triggerSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    checkPendingPunches();

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [triggerSync, checkPendingPunches]);

  // Prompt PWA installation
  const installPWA = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstallable(false);
      setDeferredPrompt(null);
    }
  };

  return {
    isOnline,
    isInstallable,
    isStandalone,
    pendingCount,
    isSyncing,
    installPWA,
    triggerSync,
    checkPendingPunches,
  };
}
