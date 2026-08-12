"use client";
import React, { useState, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Smartphone, ShieldCheck, Lock, Building2, Mail, Sparkles, ArrowRight, Activity, CheckCircle2, AlertCircle, KeyRound, Eye, EyeOff, User } from "lucide-react";
import Image from "next/image";
import dynamic from "next/dynamic";

const FaceScanOverlay = dynamic(() => import("@/components/mobile/FaceScanOverlay"), { ssr: false });

function LoginContent() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showAppSelector, setShowAppSelector] = useState(false);

  const [showFaceSetup, setShowFaceSetup] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  const { login } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialize from localStorage immediately if available (prevents flashing default logo)
  const [companyName, setCompanyName] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("COMPANY_NAME") || "";
    }
    return "";
  });
  
  const [companyLogo, setCompanyLogo] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("COMPANY_LOGO") || "";
    }
    return "";
  });

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (let registration of registrations) {
          registration.unregister();
        }
      });
      // Aggressively clear PWA cache
      caches.keys().then((names) => {
        for (let name of names) {
          caches.delete(name);
        }
      });
    }
    
    // Fetch system configuration for branding
    const fetchConfig = async () => {
      try {
        const res = await api.get("/system-config/");
        const configs = res.data;
        
        // Cache globally for useSystemConfig as well
        localStorage.setItem("system_configs", JSON.stringify(configs));
        
        const nameObj = configs.find((c: any) => c.key === "COMPANY_NAME");
        const logoObj = configs.find((c: any) => c.key === "COMPANY_LOGO");
        
        if (nameObj?.value) {
          setCompanyName(nameObj.value);
          localStorage.setItem("COMPANY_NAME", nameObj.value);
        }
        if (logoObj?.value) {
          setCompanyLogo(logoObj.value);
          localStorage.setItem("COMPANY_LOGO", logoObj.value);
        }
      } catch (e) {
        console.error("Failed to load configs", e);
      }
    };
    fetchConfig();
  }, []);

  const redirectParam = searchParams.get("redirect") || searchParams.get("returnUrl") || searchParams.get("from");


  
  const handleCaptureFace = async () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      const base64 = canvas.toDataURL("image/jpeg", 0.9).split(",")[1];
      try {
        setLoading(true);
        const user = useAuthStore.getState().user;
        const apiModule = await import("@/lib/api");
        // Register face via API
        await apiModule.default.post("/mobile/me/reference-photo", { photo_base64: base64 });
        
        // Face registered, now continue normal flow
        if (stream) { stream.getTracks().forEach(t => t.stop()); setStream(null); }
        setShowFaceSetup(false);
        setLoading(false);
        
        // Execute the same logic as the rest of handleSubmit
        const platformAccess = (user as any)?.platform_access || "both";
        const emailLower = String((user as any)?.email || "").toLowerCase();
        const isSuperUser = (user as any)?.is_superuser || emailLower === "admin@dlaredes.com.co" || false;
        const role = String((user as any)?.role_id || (user as any)?.role_name || "").toLowerCase();
        if (isSuperUser || role.includes("super")) {
          router.push("/dashboard");
          return;
        }
        if (platformAccess === "both" || role.includes("admin")) {
          setShowAppSelector(true);
          return;
        }
        const redirectParam = searchParams.get("redirect") || searchParams.get("returnUrl") || searchParams.get("from");
        if (redirectParam && !redirectParam.includes("attendance") && !redirectParam.includes("mobile")) {
          router.push(redirectParam); return;
        }
        if (platformAccess === "mobile") { router.push("/mobile"); }
        else { router.push("/dashboard"); }
        
      } catch (err: any) {
        console.error(err);
        const detailedError = err?.response?.data?.detail || "Error al registrar rostro. Intente nuevamente.";
        setError(detailedError);
        setLoading(false);
      }
    }
  };

  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordChangeError, setPasswordChangeError] = useState("");

  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\/`~;]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const validCount = [hasMinLength, hasUppercase, hasLowercase, hasNumber, hasSpecial].filter(Boolean).length;
  const isFormValid = validCount === 5 && passwordsMatch;

  const proceedAfterAuth = (user: any) => {
    const platformAccess = user?.platform_access || "both";
    const emailLower = String(user?.email || "").toLowerCase();
    const isSuperUser = user?.is_superuser || emailLower === "admin@dlaredes.com.co" || false;
    const role = String(user?.role_id || user?.role_name || "").toLowerCase();

    // 1. Web-only users NEVER get prompted for face setup -> go straight to Dashboard
    if (platformAccess === "web") {
      if (redirectParam && !redirectParam.includes("attendance") && !redirectParam.includes("mobile")) {
        router.push(redirectParam);
        return;
      }
      router.push("/dashboard");
      return;
    }

    // 2. Administrators or users with access to both platforms -> App Selector / Dashboard
    const isAdminOrBoth = isSuperUser || role.includes("admin") || role.includes("super") || platformAccess === "both";
    if (isAdminOrBoth) {
      setShowAppSelector(true);
      setLoading(false);
      return;
    }

    // 3. Operational Mobile Users (platform_access === 'mobile')
    const hasPhoto = !!user?.photo_url || !!user?.is_face_registered || (typeof window !== "undefined" && localStorage.getItem("dla_face_registered") === "true");
    if (platformAccess === "mobile" && !hasPhoto) {
      setShowFaceSetup(true);
      setLoading(false);
      return;
    }

    if (platformAccess === "mobile") {
      router.push("/mobile");
      return;
    }

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

    router.push("/dashboard");
  };

  const handleSaveFirstLoginPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;
    setChangingPassword(true);
    setPasswordChangeError("");

    try {
      await api.post("/auth/first-login-password", {
        new_password: newPassword,
        confirm_password: confirmPassword,
      });

      const { updateUser } = useAuthStore.getState();
      updateUser({ first_login: false, force_password_change: false });
      
      const currentUser = useAuthStore.getState().user;
      setShowPasswordChange(false);
      setChangingPassword(false);
      
      proceedAfterAuth(currentUser);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "Error al actualizar contraseña.";
      setPasswordChangeError(msg);
      setChangingPassword(false);
    }
  };

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

      const loggedUser = await login(email, password, targetPlatform);
      const emailLower = email.trim().toLowerCase();
      const isSuperUser = (loggedUser as any)?.is_superuser || emailLower === "admin@dlaredes.com.co" || false;

      // Force Password Change on first login (for non-superuser default accounts)
      if (((loggedUser as any)?.first_login || (loggedUser as any)?.force_password_change) && !isSuperUser) {
        setShowPasswordChange(true);
        setLoading(false);
        return;
      }

      proceedAfterAuth(loggedUser);
    } catch (err) {
      const axiosErr = err as { response?: { data?: { detail?: string } }; message?: string };
      const msg = axiosErr?.response?.data?.detail || axiosErr?.message || "Credenciales inválidas";
      setError(msg);
      setLoading(false);
    }
  };

  
    if (showPasswordChange) {
      return (
        <div className="relative min-h-screen w-full flex items-center justify-center p-4 bg-background">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-32 -left-32 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl animate-pulse" />
            <div className="absolute top-1/2 -right-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse delay-1000" />
          </div>

          <Card className="relative w-full max-w-lg shadow-ios border-border/80 bg-card/95 text-card-foreground backdrop-blur-xl animate-in fade-in zoom-in-95 duration-500">
            <CardHeader className="text-center pb-2 border-b border-border/80 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-primary to-emerald-500 animate-pulse" />
              
              <div className="mx-auto bg-amber-500/10 border border-amber-500/30 p-3.5 rounded-2xl mb-2 w-fit">
                <KeyRound className="h-8 w-8 text-amber-500" />
              </div>
              <CardTitle className="text-xl font-black tracking-tight text-foreground">
                Actualización Obligatoria de Contraseña
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                Por motivos de seguridad en tu primer ingreso, debes crear una contraseña propia y segura para activar tu cuenta.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 pt-4">
              <form onSubmit={handleSaveFirstLoginPassword} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Nueva Contraseña</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type={showNewPassword ? "text" : "password"}
                      placeholder="Escribe tu nueva contraseña segura"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="pl-9 pr-10 bg-background/50 border-input text-xs"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Confirmar Nueva Contraseña</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Repite la nueva contraseña"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-9 pr-10 bg-background/50 border-input text-xs"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Strength meter bar */}
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-[11px] font-medium">
                    <span className="text-muted-foreground">Nivel de seguridad:</span>
                    <span className={
                      validCount <= 2 ? "text-red-500 font-bold" :
                      validCount <= 4 ? "text-amber-500 font-bold" :
                      "text-emerald-500 font-bold"
                    }>
                      {newPassword.length === 0 ? "Sin iniciar" : validCount <= 2 ? "Débil" : validCount <= 4 ? "Aceptable" : "Excelente y Segura"}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        newPassword.length === 0 ? "w-0" :
                        validCount <= 2 ? "bg-red-500 w-1/3" :
                        validCount <= 4 ? "bg-amber-500 w-2/3" :
                        "bg-emerald-500 w-full"
                      }`}
                    />
                  </div>
                </div>

                {/* Requirement Checklist */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-border/80 space-y-1.5 text-[11px]">
                  <p className="font-bold text-slate-700 dark:text-slate-300 mb-1">Requisitos de seguridad:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    <div className={`flex items-center gap-1.5 ${hasMinLength ? "text-emerald-600 font-semibold" : "text-muted-foreground"}`}>
                      <CheckCircle2 className={`h-3.5 w-3.5 ${hasMinLength ? "text-emerald-600" : "text-slate-300 dark:text-slate-600"}`} />
                      <span>Mínimo 8 caracteres</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${hasUppercase ? "text-emerald-600 font-semibold" : "text-muted-foreground"}`}>
                      <CheckCircle2 className={`h-3.5 w-3.5 ${hasUppercase ? "text-emerald-600" : "text-slate-300 dark:text-slate-600"}`} />
                      <span>Letra mayúscula (A-Z)</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${hasLowercase ? "text-emerald-600 font-semibold" : "text-muted-foreground"}`}>
                      <CheckCircle2 className={`h-3.5 w-3.5 ${hasLowercase ? "text-emerald-600" : "text-slate-300 dark:text-slate-600"}`} />
                      <span>Letra minúscula (a-z)</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${hasNumber ? "text-emerald-600 font-semibold" : "text-muted-foreground"}`}>
                      <CheckCircle2 className={`h-3.5 w-3.5 ${hasNumber ? "text-emerald-600" : "text-slate-300 dark:text-slate-600"}`} />
                      <span>Al menos un número (0-9)</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${hasSpecial ? "text-emerald-600 font-semibold" : "text-muted-foreground"}`}>
                      <CheckCircle2 className={`h-3.5 w-3.5 ${hasSpecial ? "text-emerald-600" : "text-slate-300 dark:text-slate-600"}`} />
                      <span>Carácter especial (!@#$...)</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${passwordsMatch ? "text-emerald-600 font-semibold" : "text-muted-foreground"}`}>
                      <CheckCircle2 className={`h-3.5 w-3.5 ${passwordsMatch ? "text-emerald-600" : "text-slate-300 dark:text-slate-600"}`} />
                      <span>Coinciden ambas claves</span>
                    </div>
                  </div>
                </div>

                {passwordChangeError && (
                  <div className="p-2.5 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive flex items-start gap-2 text-xs">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{passwordChangeError}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={!isFormValid || changingPassword}
                  className="w-full py-5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white font-bold text-sm shadow-lg rounded-xl transition-all"
                >
                  {changingPassword ? "Actualizando Contraseña..." : "Guardar Contraseña y Continuar"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      );
    }

    if (showFaceSetup) {
      return (
        <FaceScanOverlay 
          onCapture={(base64Img) => {
             setLoading(true);
             const user = useAuthStore.getState().user;
             import("@/lib/api").then(apiModule => {
               apiModule.default.post("/mobile/me/reference-photo", { photo_base64: base64Img })
                 .then(() => {
                    localStorage.setItem("dla_face_registered", "true");
                    setShowFaceSetup(false);
                    setLoading(false);
                    const updatedUser = { ...user, is_face_registered: true, photo_url: base64Img };
                    useAuthStore.getState().updateUser(updatedUser);
                    proceedAfterAuth(updatedUser);
                 })
                 .catch(err => {
                    console.error("Reference photo upload error:", err);
                    // Even if backend biometric encoding had warning, let user proceed if photo saved
                    localStorage.setItem("dla_face_registered", "true");
                    setShowFaceSetup(false);
                    setLoading(false);
                    proceedAfterAuth({ ...user, is_face_registered: true });
                 });
             });
          }}
          onCancel={() => {
             setShowFaceSetup(false);
             setLoading(false);
             setError("Debe registrar su fotografía de referencia para acceder a la app móvil.");
          }}
        />
      );
    }


    if (showAppSelector) {
    return (
      <div className="relative min-h-screen w-full flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md shadow-ios border-border bg-card text-card-foreground animate-in fade-in zoom-in-95 duration-500">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto bg-primary/10 p-4 rounded-full mb-3">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-black">Selecciona la Aplicación</CardTitle>
            <CardDescription className="text-muted-foreground">
              Tienes acceso a múltiples plataformas. ¿A dónde deseas ingresar?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 mt-4">
            <Button
              onClick={() => router.push("/dashboard")}
              className="w-full py-8 bg-card hover:bg-muted border border-border text-foreground shadow-ios flex flex-col items-center justify-center gap-2 h-auto rounded-2xl"
            >
              <Building2 className="h-6 w-6 text-primary" />
              <div className="text-center">
                <div className="font-bold">ERP Administrativo</div>
                <div className="text-xs text-muted-foreground font-normal mt-1">Gestión de recursos, reportes y programación</div>
              </div>
            </Button>

            <Button
              onClick={() => router.push("/mobile")}
              className="w-full py-8 bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-primary-foreground shadow-lg flex flex-col items-center justify-center gap-2 h-auto rounded-2xl"
            >
              <Smartphone className="h-6 w-6" />
              <div className="text-center">
                <div className="font-bold">PWA Campo (App Móvil)</div>
                <div className="text-xs text-white/80 font-normal mt-1">Operativa, marcación de visitas y GPS</div>
              </div>
            </Button>
          </CardContent>
          <div className="text-center pb-4">
            <button 
              onClick={() => {
                if ('serviceWorker' in navigator) navigator.serviceWorker.getRegistrations().then(r => r.forEach(reg => reg.unregister()));
                caches.keys().then(names => names.forEach(n => caches.delete(n)));
                window.location.reload();
              }}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              Limpiar Caché y Actualizar App
            </button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 overflow-hidden bg-background select-none">
      {/* Dynamic Background Motion Lights */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 -right-32 w-96 h-96 bg-secondary/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute -bottom-32 left-1/3 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse delay-700" />

        {/* Futuristic Grid Overlay */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.03] dark:opacity-10" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" className="text-primary" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Glassmorphic Animated Login Card */}
      <Card className="relative w-full max-w-md shadow-ios border-border/80 bg-card/90 text-card-foreground backdrop-blur-xl animate-in fade-in slide-in-from-bottom-6 duration-700">
        <CardHeader className="text-center space-y-3 pb-4 border-b border-border/80 relative overflow-hidden">
          {/* Animated Header Gradient Bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-secondary to-primary animate-pulse" />

          {/* Glowing Animated Icon Badge */}
          <div className="mx-auto relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary to-secondary rounded-2xl blur opacity-30 dark:opacity-70 group-hover:opacity-100 transition duration-500 animate-pulse" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-background text-primary border border-primary/40 shadow-xl overflow-hidden p-1">
              {mounted && companyLogo ? (
                <img src={companyLogo} alt="Logo" className="w-full h-full object-contain animate-in fade-in" />
              ) : (
                <Shield className="h-8 w-8 text-primary" />
              )}
            </div>
          </div>

          <div>
            <CardTitle className="text-xl font-black tracking-tight text-foreground">
              {mounted && companyName ? companyName : "DLA Access Enterprise"}
            </CardTitle>
            <CardDescription className="text-xs font-medium text-muted-foreground mt-1 flex items-center justify-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-secondary animate-spin" /> Plataforma ERP & PWA Móvil
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="pt-5 space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Correo Electrónico o Cédula</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="admin@dlaredes.com.co o N° de Cédula"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9 bg-background/50 border-input text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary transition-all text-xs"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Contraseña de Acceso</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 bg-background/50 border-input text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary transition-all text-xs"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive flex items-start gap-2.5 animate-in fade-in slide-in-from-top-2">
                <Lock className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <span className="font-medium text-xs">{error}</span>
              </div>
            )}

            <Button
              type="submit"
              className="w-full py-5 bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-primary-foreground font-black text-sm shadow-xl hover:shadow-primary/25 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2 group rounded-xl"
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
          <div className="pt-3 border-t border-border/80 text-center space-y-2.5">
            <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-1 font-medium">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Aplicaciones Kiosk:
            </p>
            <div className="flex justify-center items-center gap-3">
              <a
                href="/attendance"
                className="px-4 py-2 w-full rounded-xl bg-secondary/10 border border-secondary/30 text-xs text-secondary-foreground dark:text-secondary hover:bg-secondary/20 transition-all flex items-center justify-center gap-1.5 font-bold shadow-sm"
              >
                <ShieldCheck className="h-4 w-4 text-secondary-foreground dark:text-secondary" /> Ingresar a PWA Sedes (Kiosk)
              </a>
            </div>
          </div>

          <div className="pt-2 text-center text-[10px] text-muted-foreground">
            <p>&copy; {mounted ? new Date().getFullYear() : "2026"} {mounted && companyName ? companyName : "DLA Access"} | Sistema de Control de Acceso</p>
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
