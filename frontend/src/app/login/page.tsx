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
  const [showAppSelector, setShowAppSelector] = useState(false);
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
      if (typeof window !== "undefined") {
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

      // If user has both, show selector (unless they are superadmin, then just let them choose or go dashboard)
      // Actually, if they are admin/superuser they also should just go to dashboard or let them choose?
      // User requested: "si tiene las dos aplicaciones asignadas que me muestre como dos botones"
      if (platformAccess === "both") {
        setShowAppSelector(true);
        setLoading(false);
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
        router.push("/dashboard");
      }
    } catch (err) {
      const axiosErr = err as { response?: { data?: { detail?: string } }; message?: string };
      const msg = axiosErr?.response?.data?.detail || axiosErr?.message || "Credenciales inválidas";
      setError(msg);
      setLoading(false);
    }
  };

  if (showAppSelector) {
    return (
      <div className="relative min-h-screen w-full flex items-center justify-center p-4 bg-slate-950">
        <Card className="w-full max-w-md shadow-2xl border-slate-800 bg-slate-900 text-white animate-in fade-in zoom-in-95 duration-500">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto bg-blue-500/10 p-4 rounded-full mb-3">
              <Shield className="h-8 w-8 text-cyan-400" />
            </div>
            <CardTitle className="text-2xl font-black">Selecciona la Aplicación</CardTitle>
            <CardDescription className="text-slate-400">
              Tienes acceso a múltiples plataformas. ¿A dónde deseas ingresar?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 mt-4">
            <Button
              onClick={() => router.push("/dashboard")}
              className="w-full py-8 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white shadow flex flex-col items-center justify-center gap-2 h-auto"
            >
              <Building2 className="h-6 w-6 text-purple-400" />
              <div className="text-center">
                <div className="font-bold">ERP Administrativo</div>
                <div className="text-xs text-slate-400 font-normal mt-1">Gestión de recursos, reportes y programación</div>
              </div>
            </Button>

            <Button
              onClick={() => router.push("/mobile")}
              className="w-full py-8 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white shadow-xl flex flex-col items-center justify-center gap-2 h-auto"
            >
              <Smartphone className="h-6 w-6" />
              <div className="text-center">
                <div className="font-bold">PWA Campo (App Móvil)</div>
                <div className="text-xs text-blue-100 font-normal mt-1">Operativa, marcación de visitas y GPS</div>
              </div>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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
              <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400" /> Aplicaciones Kiosk:
            </p>
            <div className="flex justify-center items-center gap-3">
              <a
                href="/attendance"
                className="px-4 py-2 w-full rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 hover:bg-emerald-500/20 transition-all flex items-center justify-center gap-1.5 font-bold shadow-lg"
              >
                <ShieldCheck className="h-4 w-4 text-emerald-400" /> Ingresar a PWA Sedes (Kiosk)
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
