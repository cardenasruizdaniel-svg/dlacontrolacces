"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/uiStore";
import { useAuthStore } from "@/stores/authStore";
import {
  LayoutDashboard, Users, UserCog, FileText, DollarSign,
  Calendar, MapPin, Camera, Shield, BarChart3, Bot, Settings,
  Building2, Briefcase, Activity, ShieldCheck, Smartphone, BookOpen,
} from "lucide-react";

import { useSystemConfig } from "@/lib/useSystemConfig";

const navItems = [
  { label: "Panel de Control", href: "/dashboard", icon: LayoutDashboard },
  { label: "Gestión de Empleados", href: "/employees", icon: Users },
  { label: "Contratos Laborales", href: "/contracts", icon: FileText },
  { label: "Nómina y Liquidación", href: "/payroll", icon: DollarSign },
  { label: "Clientes y Sedes", href: "/clients", icon: Building2 },
  { label: "Programación de Turnos", href: "/scheduling", icon: Calendar },
  { label: "Geolocalización GPS", href: "/geolocation", icon: MapPin },
  { label: "Control de Acceso", href: "/access-control", icon: Shield },
  { label: "Matriz de Roles e IAM", href: "/iam/roles", icon: ShieldCheck },
  { label: "Reconocimiento Facial", href: "/facial-recognition", icon: Camera },
  { label: "Reportes y Auditoría", href: "/reports", icon: BarChart3 },
  { label: "Asistente IA", href: "/ai-assistant", icon: Bot },
  { label: "Manual de Funcionamiento", href: "/help", icon: BookOpen },
  { label: "Configuración", href: "/settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen } = useUIStore();
  const { user } = useAuthStore();
  const { configs } = useSystemConfig();
  const isAdmin = user?.is_superuser || user?.role_id;

  const companyLogo = configs.find((c) => c.key === "COMPANY_LOGO")?.value;
  const companyName = configs.find((c) => c.key === "COMPANY_NAME")?.value || "DLA Redes y Seguridad";

  return (
    <aside className={cn(
      "hidden md:flex flex-col border-r bg-card transition-all duration-300",
      sidebarOpen ? "w-64" : "w-16",
    )}>
      <div className="flex h-16 items-center border-b px-4">
        <div className="flex items-center gap-2">
          {companyLogo ? (
            <div className="h-8 w-8 rounded-lg border bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
              {/* eslint-disable-next-next/no-img-element */}
              <img src={companyLogo} alt="Logo" className="h-full w-full object-contain p-0.5" />
            </div>
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
              DA
            </div>
          )}
          {sidebarOpen && (
            <div className="flex flex-col overflow-hidden">
              <span className="text-xs font-bold leading-tight truncate">{companyName}</span>
              <span className="text-[10px] text-muted-foreground leading-tight">Access Enterprise</span>
            </div>
          )}
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {sidebarOpen && <span>{item.label}</span>}
            </Link>
          );
        })}
        {isAdmin && (
          <div className="pt-2 space-y-1.5">
            <Link
              href="/mobile"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-bold transition-all shadow-sm",
                pathname === "/mobile"
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
                  : "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 hover:bg-blue-100 border border-blue-200",
              )}
            >
              <Smartphone className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400 animate-pulse" />
              {sidebarOpen && (
                <div className="flex items-center justify-between w-full">
                  <span>PWA Operativa Campo</span>
                  <span className="text-[9px] bg-blue-600 text-white px-1 py-0.5 rounded font-mono">CAMPO</span>
                </div>
              )}
            </Link>

            <Link
              href="/attendance"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-bold transition-all shadow-sm",
                pathname === "/attendance"
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white"
                  : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 border border-emerald-200",
              )}
            >
              <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              {sidebarOpen && (
                <div className="flex items-center justify-between w-full">
                  <span>PWA Asistencia Sedes</span>
                  <span className="text-[9px] bg-emerald-600 text-white px-1 py-0.5 rounded font-mono">SEDES</span>
                </div>
              )}
            </Link>
          </div>
        )}
      </nav>
      {sidebarOpen && (
        <div className="border-t p-4">
          <p className="text-[10px] text-muted-foreground text-center">&copy; DLA Redes y Seguridad</p>
        </div>
      )}
    </aside>
  );
}
