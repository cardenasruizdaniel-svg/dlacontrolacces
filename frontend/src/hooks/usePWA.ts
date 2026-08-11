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
      const pendingPunches = await getPendingPunches();
      const { getOfflineMutations } = await import("@/lib/offlineQueue");
      const pendingMutations = await getOfflineMutations();
      setPendingCount(pendingPunches.length + pendingMutations.length);
    } catch {
      setPendingCount(0);
    }
  }, []);

  // Trigger offline synchronization
  const triggerSync = useCallback(async () => {
    if (!navigator.onLine || isSyncing) return;
    setIsSyncing(true);
    try {
      // 1. Sync specific offline punches (PWA module)
      await syncOfflinePunches(api);
      
      // 2. Sync generic offline mutations
      const { getOfflineMutations, removeOfflineMutation, incrementRetryCount } = await import("@/lib/offlineQueue");
      const mutations = await getOfflineMutations();
      
      for (const mut of mutations) {
        try {
          // Replay the mutation
          await api({
            method: mut.method,
            url: mut.url,
            data: mut.data,
            headers: mut.headers,
          });
          // If successful, remove from queue
          await removeOfflineMutation(mut.id);
        } catch (error: any) {
          console.warn(`Error resyncing mutation ${mut.id}:`, error);
          if (mut.retryCount >= 3 || (error.response && error.response.status >= 400 && error.response.status < 500)) {
            // Client error (e.g. 400 Bad Request) or too many retries (500s), discard to avoid infinite loops
            await removeOfflineMutation(mut.id);
          } else {
            // Network or 500 error, retry next time
            await incrementRetryCount(mut.id);
          }
        }
      }
      
      await checkPendingPunches();
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
