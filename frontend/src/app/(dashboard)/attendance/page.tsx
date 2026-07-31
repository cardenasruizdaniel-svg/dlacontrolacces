"use client";

import React from "react";
import AttendanceView from "@/components/attendance/AttendanceView";
import { useAuthStore } from "@/stores/authStore";

export default function AttendancePWAAppPage() {
  const { user } = useAuthStore();

  return (
    <div className="min-h-screen bg-background p-2 sm:p-4 space-y-4">
      {/* Header Móvil de Asistencia */}
      <div className="bg-card p-4 rounded-2xl border shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center font-bold text-white shadow-md text-sm">
            CA
          </div>
          <div>
            <h1 className="text-base font-bold leading-tight">Control de Asistencia PWA</h1>
            <p className="text-xs text-muted-foreground">
              {user ? `Hola, ${user.full_name}` : "Sedes & Oficinas Administrativas"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px] font-mono font-semibold text-emerald-600 dark:text-emerald-400">PWA Asistencia</span>
        </div>
      </div>

      {/* Componente de Control de Asistencia */}
      <AttendanceView />
    </div>
  );
}
