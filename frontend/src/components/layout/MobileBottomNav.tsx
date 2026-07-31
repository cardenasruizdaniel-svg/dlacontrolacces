"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { usePWA } from "@/hooks/usePWA";
import { useAuthStore } from "@/stores/authStore";
import {
  Smartphone, Calendar, FileText, UserCheck,
  WifiOff, RefreshCw, LogOut
} from "lucide-react";

export default function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuthStore();
  const { isOnline, pendingCount, isSyncing, triggerSync } = usePWA();

  const [currentHash, setCurrentHash] = React.useState<string>("");

  React.useEffect(() => {
    const handleHash = () => {
      if (typeof window !== "undefined") {
        setCurrentHash(window.location.hash || "");
      }
    };
    handleHash();
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  const isMobilePWA = pathname === "/mobile" || pathname?.startsWith("/mobile");

  // Standalone PWA Campo Navigation Items
  const pwaNavItems = [
    { label: "Turno Campo", href: "/mobile#agenda", hash: "#agenda", icon: Smartphone, highlight: true },
    { label: "Mis Visitas", href: "/mobile#visitas", hash: "#visitas", icon: Calendar },
    { label: "Mi Nómina", href: "/mobile#nomina", hash: "#nomina", icon: FileText },
    { label: "Biometría", href: "/mobile#perfil", hash: "#perfil", icon: UserCheck },
  ];

  if (!isMobilePWA) {
    // Only display PWA Campo navigation bar on /mobile routes
    return null;
  }

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex flex-col bg-slate-950/95 backdrop-blur-xl border-t border-slate-800 shadow-2xl text-slate-100">
      {/* Banner de Estado Offline / Sync */}
      {(!isOnline || pendingCount > 0) && (
        <div
          onClick={triggerSync}
          className={cn(
            "px-4 py-1 text-[11px] font-medium flex items-center justify-between cursor-pointer transition-colors",
            !isOnline
              ? "bg-amber-600 text-white"
              : "bg-blue-600 text-white"
          )}
        >
          <div className="flex items-center gap-1.5">
            {!isOnline ? <WifiOff className="h-3 w-3 animate-pulse" /> : <RefreshCw className={`h-3 w-3 ${isSyncing ? "animate-spin" : ""}`} />}
            <span>
              {!isOnline
                ? "Modo Offline PWA Activo"
                : `${pendingCount} marcación${pendingCount > 1 ? "es" : ""} pendiente${pendingCount > 1 ? "s" : ""} por sincronizar`}
            </span>
          </div>
          <span className="text-[9px] uppercase font-bold tracking-wider underline">
            {isSyncing ? "Sincronizando..." : "Sincronizar"}
          </span>
        </div>
      )}

      {/* Navegación Inferior Móvil PWA Campo 100% Independiente */}
      <nav className="flex items-center justify-around h-14 px-2">
        {pwaNavItems.map((item) => {
          const isActive =
            item.hash === "#agenda"
              ? (!currentHash || currentHash === "#agenda" || currentHash === "#")
              : currentHash === item.hash;

          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full gap-0.5 text-[10px] font-semibold transition-all relative",
                isActive
                  ? "text-cyan-400 font-bold"
                  : "text-slate-400 hover:text-slate-200",
              )}
            >
              {item.highlight ? (
                <div className={cn(
                  "p-1.5 rounded-xl transition-transform",
                  isActive ? "bg-gradient-to-tr from-blue-600 to-cyan-500 text-white scale-110 shadow-lg" : "bg-slate-800 text-slate-300"
                )}>
                  <item.icon className="h-4 w-4" />
                </div>
              ) : (
                <item.icon className="h-4 w-4" />
              )}
              <span className="leading-tight">{item.label}</span>
              {isActive && (
                <span className="absolute bottom-1 w-1 h-1 bg-cyan-400 rounded-full" />
              )}
            </Link>
          );
        })}

        <button
          type="button"
          onClick={handleLogout}
          className="flex flex-col items-center justify-center flex-1 h-full gap-0.5 text-[10px] font-semibold text-rose-400 hover:text-rose-300 transition-all"
        >
          <LogOut className="h-4 w-4" />
          <span className="leading-tight">Salir</span>
        </button>
      </nav>
    </div>
  );
}
