"use client";
import React, { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Smartphone } from "lucide-react";
import { usePWA } from "@/hooks/usePWA";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading, loadUser } = useAuthStore();
  const { isOnline, isSyncing, pendingCount } = usePWA();
  const router = useRouter();
  const pathname = usePathname();

  const isAttendanceKiosk = pathname === "/attendance" || pathname?.startsWith("/attendance/");
  const isMobilePWA = pathname === "/mobile" || pathname?.startsWith("/mobile/");

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    // Bypasses login check for public attendance kiosk station (/attendance)
    if (isAttendanceKiosk) return;

    if (!isLoading && !isAuthenticated) {
      const currentPath = typeof window !== "undefined" ? window.location.pathname : "";
      if (currentPath && currentPath !== "/" && currentPath !== "/login") {
        router.push(`/login?redirect=${encodeURIComponent(currentPath)}`);
      } else {
        router.push("/login?redirect=%2Fdashboard");
      }
      return;
    }

    // Strict PWA Isolation: Mobile platform employees are restricted from accessing ERP Web routes
    if (!isLoading && isAuthenticated && user) {
      const platformAccess = (user as any)?.platform_access;
      if (platformAccess === "mobile" && !isMobilePWA && !isAttendanceKiosk) {
        router.push("/mobile");
      }
    }
  }, [isLoading, isAuthenticated, user, pathname, router, isAttendanceKiosk, isMobilePWA]);

  // 1. PUBLIC KIOSK MODE (/attendance): Standalone full-screen without auth or web ERP layout
  if (isAttendanceKiosk) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 overflow-y-auto">
        {children}
      </div>
    );
  }

  // 2. FIELD PWA MODE (/mobile): Standalone PWA view (handles its own mobile loading and layout without desktop skeleton)
  if (isMobilePWA) {
    if (isLoading) {
      return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 space-y-4 text-center">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-white shadow-lg">
            <Smartphone className="h-6 w-6 animate-pulse" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold">DLA Access Mobile</h3>
            <p className="text-xs text-muted-foreground">Cargando aplicación PWA de campo...</p>
          </div>
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        </div>
      );
    }

    if (!isAuthenticated) {
      return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 space-y-3 text-center">
          <p className="text-sm font-semibold text-muted-foreground">Redirigiendo al inicio de sesión PWA...</p>
          <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-background overflow-y-auto pb-20">
        {children}
        <MobileBottomNav />
      </div>
    );
  }

  // 3. DESKTOP ERP WEB MODE: Full ERP layout with Sidebar and Header
  if (isLoading) {
    return (
      <div className="flex h-screen">
        <div className="hidden md:block w-64 border-r p-4 space-y-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <div className="flex-1 p-6 space-y-4">
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center text-muted-foreground text-sm">
        Redirigiendo al inicio de sesión...
      </div>
    );
  }

  const platformAccess = (user as any)?.platform_access;
  if (platformAccess === "mobile" && !isMobilePWA && !isAttendanceKiosk) {
    return (
      <div className="flex h-screen items-center justify-center text-muted-foreground text-sm flex-col gap-2">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        Redirigiendo a su plataforma móvil...
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden print:overflow-visible print:h-auto relative">
      {!isOnline && (
        <div className="absolute top-0 left-0 right-0 z-50 bg-rose-600 text-white text-[11px] py-1 text-center font-semibold print:hidden">
          Sin conexión a internet. Los cambios se guardarán localmente.
        </div>
      )}
      {isSyncing && pendingCount > 0 && (
        <div className="absolute top-0 left-0 right-0 z-50 bg-amber-500 text-white text-[11px] py-1 text-center font-semibold animate-pulse print:hidden">
          Sincronizando {pendingCount} elementos pendientes...
        </div>
      )}
      <Sidebar />
      <div className={`flex flex-1 flex-col overflow-hidden print:overflow-visible print:h-auto print:block ${(!isOnline || (isSyncing && pendingCount > 0)) ? "pt-6 print:pt-0" : ""}`}>
        <Header />
        <main className="flex-1 overflow-y-auto print:overflow-visible print:block p-4 md:p-6 pb-20 md:pb-6 print:p-0 bg-muted/30 print:bg-transparent">
          {children}
        </main>
      </div>
    </div>
  );
}
