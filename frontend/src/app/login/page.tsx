"use client";
import React, { useState, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Smartphone, ShieldCheck, Lock, Building2, Mail, Sparkles, ArrowRight, Activity, CheckCircle2 } from "lucide-react";

function LoginContent() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [loginMode, setLoginMode] = useState<"auto" | "mobile" | "attendance" | "dashboard">("auto");
  const { login } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    setMounted(true);
  }, []);

  const redirectParam = searchParams.get("redirect") || searchParams.get("returnUrl") || searchParams.get("from");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      let targetPlatform = "auto";
      if (loginMode === "mobile" || loginMode === "attendance") {
        targetPlatform = "mobile";
      } else if (loginMode === "dashboard") {
        targetPlatform = "web";
      } else if (typeof window !== "undefined") {
        const isMobileDevice =
          window.innerWidth < 768 ||
          window.matchMedia("(display-mode: standalone)").matches ||
          /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        if (isMobileDevice) targetPlatform = "mobile";
      }

      await login(email, password, targetPlatform);

      const loggedUser = useAuthStore.getState().user;
      const platformAccess = (loggedUser as any)?.platform_access || "both";
      const isSuperUser = (loggedUser as any)?.is_superuser || false;
      const role = String((loggedUser as any)?.role_id || (loggedUser as any)?.role_name || "").toLowerCase();

      if (loginMode === "mobile") { router.push("/mobile"); return; }
      if (loginMode === "attendance") { router.push("/attendance"); return; }
      if (loginMode === "dashboard") { router.push("/dashboard"); return; }

      if (
        redirectParam &&
        redirectParam !== "/attendance" &&
        redirectParam !== "%2Fattendance" &&
        !redirectParam.includes("attendance") &&
        redirectParam !== "/mobile" &&
        redirectParam !== "%2Fmobile"
      ) {
        router.push(redirectParam);
        return;
      }

      // Administrators & Superusers -> Always go to ERP Web Dashboard
      if (isSuperUser || role.includes("admin") || role.includes("super") || email.toLowerCase().includes("admin")) {
        router.push("/dashboard");
        return;
      }

      // Operational Employees
      if (platformAccess === "mobile") {
        router.push("/mobile");
      } else {
        const isMobileDevice =
          typeof window !== "undefined" &&
          (window.innerWidth < 768 ||
            window.matchMedia("(display-mode: standalone)").matches ||
            /Android|iPhone|iPad|iPod/i.test(navigator.userAgent));

        if (isMobileDevice) {
          router.push("/mobile");
        } else {
          router.push("/dashboard");
        }
      }
    } catch (err) {
      const axiosErr = err as { response?: { data?: { detail?: string } }; message?: string };
      const msg = axiosErr?.response?.data?.detail || axiosErr?.message || "Credenciales inválidas";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const modeInfo = {
    auto: { title: "Modo Detectar Automático", desc: "Evalúa tus permisos y tu dispositivo para redirigirte directamente al módulo correspondiente.", color: "border-blue-500/50 bg-blue-500/10 text-blue-300" },
    mobile: { title: "PWA Campo Operativa", desc: "Diseñada para supervisores y vigilantes: marcaciones GPS, visitas y turnos.", color: "border-cyan-500/50 bg-cyan-500/10 text-cyan-300" },
    attendance: { title: "PWA Sedes & Kiosk", desc: "Estación fija de control de asistencia para puntos de acceso y sedes.", color: "border-emerald-500/50 bg-emerald-500/10 text-emerald-300" },
    dashboard: { title: "ERP Web Administrativo", desc: "Consola de administración completa: contratos, nómina, empleados y reportes.", color: "border-purple-500/50 bg-purple-500/10 text-purple-300" },
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 overflow-hidden bg-slate-950 select-none">
      {/* Dynamic Background Motion Lights */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 -right-32 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute -bottom-32 left-1/3 w-96 h-96 bg-cyan-600/20 rounded-full blur-3xl animate-pulse delay-700" />

        {/* Futuristic Grid Overlay */}
        <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" className="text-blue-400" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Glassmorphic Animated Login Card */}
      <Card className={`relative w-full max-w-md shadow-2xl border-slate-800/80 bg-slate-900/90 text-white backdrop-blur-xl transition-all duration-700 transform ${
        mounted ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-6 scale-95"
      }`}>
        <CardHeader className="text-center space-y-3 pb-4 border-b border-slate-800/80 relative overflow-hidden">
          {/* Animated Header Gradient Bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400 animate-pulse" />

          {/* Glowing Animated Icon Badge */}
          <div className="mx-auto relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-2xl blur opacity-70 group-hover:opacity-100 transition duration-500 animate-pulse" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-950 text-blue-400 border border-blue-500/40 shadow-xl">
              <Shield className="h-8 w-8 text-cyan-400" />
            </div>
          </div>

          <div>
            <CardTitle className="text-2xl font-black tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
              DLA Access Enterprise
            </CardTitle>
            <CardDescription className="text-xs font-medium text-slate-400 mt-1 flex items-center justify-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-cyan-400 animate-spin" /> Plataforma ERP & PWA Móvil | DLA Redes
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="pt-5 space-y-5">
          {/* Dynamic Destination Switcher */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-300 uppercase tracking-wider">
              <span>Seleccionar Destino al Ingresar</span>
              <span className="text-[10px] text-cyan-400 font-mono font-normal">Modo: {loginMode.toUpperCase()}</span>
            </div>

            <div className="grid grid-cols-4 gap-1 p-1 bg-slate-950/90 rounded-xl border border-slate-800 text-[10px]">
              <button
                type="button"
                onClick={() => setLoginMode("auto")}
                className={`py-2 px-1 rounded-lg font-bold transition-all duration-300 ${
                  loginMode === "auto" ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg scale-[1.02]" : "text-slate-400 hover:text-white hover:bg-slate-900"
                }`}
              >
                Auto
              </button>
              <button
                type="button"
                onClick={() => setLoginMode("mobile")}
                className={`py-2 px-1 rounded-lg font-bold transition-all duration-300 flex items-center justify-center gap-1 ${
                  loginMode === "mobile" ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg scale-[1.02]" : "text-slate-400 hover:text-white hover:bg-slate-900"
                }`}
              >
                <Smartphone className="h-3 w-3" /> Campo
              </button>
              <button
                type="button"
                onClick={() => setLoginMode("attendance")}
                className={`py-2 px-1 rounded-lg font-bold transition-all duration-300 flex items-center justify-center gap-1 ${
                  loginMode === "attendance" ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg scale-[1.02]" : "text-slate-400 hover:text-white hover:bg-slate-900"
                }`}
              >
                <ShieldCheck className="h-3 w-3" /> Sedes
              </button>
              <button
                type="button"
                onClick={() => setLoginMode("dashboard")}
                className={`py-2 px-1 rounded-lg font-bold transition-all duration-300 flex items-center justify-center gap-1 ${
                  loginMode === "dashboard" ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg scale-[1.02]" : "text-slate-400 hover:text-white hover:bg-slate-900"
                }`}
              >
                <Building2 className="h-3 w-3" /> ERP Web
              </button>
            </div>

            {/* Dynamic Mode Helper Info */}
            <div className={`p-2.5 rounded-xl border text-[11px] transition-all duration-300 ${modeInfo[loginMode].color}`}>
              <p className="font-bold flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 animate-pulse" /> {modeInfo[loginMode].title}
              </p>
              <p className="text-[10.5px] opacity-90 mt-0.5">{modeInfo[loginMode].desc}</p>
            </div>
          </div>

          {/* Form Fields */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Correo Electrónico o Cédula</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="admin@dlaredes.com.co o N° de Cédula"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9 bg-slate-950/80 border-slate-800 text-white placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:border-cyan-500 transition-all text-xs"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Contraseña de Acceso</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 bg-slate-950/80 border-slate-800 text-white placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:border-cyan-500 transition-all text-xs"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in slide-in-from-top-2">
                <Lock className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            <Button
              type="submit"
              className="w-full py-5 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-black text-sm shadow-xl hover:shadow-cyan-500/25 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2 group"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Verificando Credenciales...</span>
                </div>
              ) : (
                <>
                  <span>Ingresar a DLA Access</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>
          </form>

          {/* Quick Standalone PWA Links */}
          <div className="pt-3 border-t border-slate-800/80 text-center space-y-2.5">
            <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1 font-medium">
              <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400" /> Aplicaciones y Estaciones PWA Móviles:
            </p>
            <div className="flex justify-center items-center gap-3">
              <a
                href="/mobile"
                className="px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-xs text-blue-300 hover:bg-blue-500/20 transition-all flex items-center gap-1.5 font-bold"
              >
                <Smartphone className="h-3.5 w-3.5 text-blue-400" /> PWA Campo
              </a>
              <a
                href="/attendance"
                className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 hover:bg-emerald-500/20 transition-all flex items-center gap-1.5 font-bold"
              >
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> PWA Sedes (Kiosk)
              </a>
            </div>
          </div>

          <div className="pt-2 text-center text-[10px] text-slate-500">
            <p>&copy; {new Date().getFullYear()} DLA Redes y Seguridad | Sistema de Control de Acceso</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-white text-sm">Cargando...</div>}>
      <LoginContent />
    </Suspense>
  );
}
