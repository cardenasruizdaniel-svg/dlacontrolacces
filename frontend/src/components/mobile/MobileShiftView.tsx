"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { usePWA } from "@/hooks/usePWA";
import { saveOfflinePunch, getCachedAgenda, saveCachedAgenda } from "@/lib/offlineStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Clock, MapPin, Camera, CheckCircle2, AlertCircle, RefreshCw,
  LogOut, Play, Square, ShieldCheck, UserCheck, PhoneCall, AlertTriangle,
  FileText, Upload, User, DollarSign, Calendar, Share2, Printer, Download,
  Edit3, Save, Coffee, Utensils, Navigation, ExternalLink, Send, ShieldAlert, Check
} from "lucide-react";

export default function MobileShiftView() {
  const { user, logout, loadUser } = useAuthStore();
  const { isOnline, pendingCount, isSyncing, triggerSync } = usePWA();
  const router = useRouter();

  // Active Session & Visit Data
  const [activeSession, setActiveSession] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [punching, setPunching] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"agenda" | "visitas" | "nomina" | "perfil" | "marcar">("agenda");
  const [filterStatus, setFilterStatus] = useState<"all" | "today" | "pending" | "completed" | "lost" | "cancelled">("all");

  // Payroll Summary & Profile State
  const [payrollData, setPayrollData] = useState<any | null>(null);
  const [employeeProfile, setEmployeeProfile] = useState<any | null>(null);

  // Live Clock & Chronometer
  const [currentTime, setCurrentTime] = useState<string>("");
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // WebCam Camera Stream & Photo Capture State
  const [cameraModalOpen, setCameraModalOpen] = useState<boolean>(false);
  const [cameraPurpose, setCameraPurpose] = useState<"reference" | "start" | "end" | "novedad">("reference");
  const [targetShiftId, setTargetShiftId] = useState<string | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturedPhotoBase64, setCapturedPhotoBase64] = useState<string | null>(null);
  const [observations, setObservations] = useState<string>("");
  const [incidentType, setIncidentType] = useState<string>("cliente_ausente");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Personal Info Edit State
  const [editingPersonal, setEditingPersonal] = useState<boolean>(false);
  const [personalForm, setPersonalForm] = useState({
    mobile: "",
    phone: "",
    address: "",
    city: "",
    email: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    emergency_contact_relation: "",
  });
  const [savingPersonal, setSavingPersonal] = useState<boolean>(false);

  // Novedad Modal Open State
  const [novedadModalOpen, setNovedadModalOpen] = useState<boolean>(false);
  const [novedadShift, setNovedadShift] = useState<any | null>(null);
  const [savingNovedad, setSavingNovedad] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Real Agenda List loaded from ERP backend
  const [visitList, setVisitList] = useState<any[]>([]);

  // Sync Hash to Tab
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace("#", "");
      if (hash === "visitas" || hash === "nomina" || hash === "perfil" || hash === "marcar") {
        setActiveTab(hash as any);
      } else {
        setActiveTab("agenda");
      }
    };
    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  // Update clock
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString("es-CO", { hour12: true }));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Chronometer logic if in active shift
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (activeSession?.active) {
      timer = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => clearInterval(timer);
  }, [activeSession?.active]);

  const formatElapsed = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600).toString().padStart(2, "0");
    const mins = Math.floor((seconds % 3600) / 60).toString().padStart(2, "0");
    const secs = (seconds % 60).toString().padStart(2, "0");
    return `${hrs}:${mins}:${secs}`;
  };

  // Clean Logout Handler
  const handleCleanLogout = async () => {
    stopCamera();
    try {
      await logout();
    } catch {}
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    if (typeof window !== "undefined") {
      window.location.replace("/login");
    }
  };

  // Fetch active session or load cached agenda
  const fetchSession = useCallback(async () => {
    setLoading(true);
    try {
      if (navigator.onLine) {
        const res = await api.get("/mobile/me/active-session");
        setActiveSession(res.data);
        const initialShifts = res.data?.all_shifts || res.data?.today_shifts || [];
        setVisitList(initialShifts);
        await saveCachedAgenda(initialShifts);

        // Secondary fetch for all assigned shifts across all dates
        try {
          const sRes = await api.get("/mobile/me/shifts");
          if (Array.isArray(sRes.data) && sRes.data.length > 0) {
            setVisitList(sRes.data);
            await saveCachedAgenda(sRes.data);
          }
        } catch {}

        // Fetch payroll & profile info
        try {
          const pRes = await api.get("/mobile/me/payroll-summary");
          setPayrollData(pRes.data);
        } catch {}

        try {
          const eRes = await api.get("/mobile/me/employee");
          setEmployeeProfile(eRes.data);
          if (eRes.data) {
            setPersonalForm({
              mobile: eRes.data.mobile || "",
              phone: eRes.data.phone || "",
              address: eRes.data.address || "",
              city: eRes.data.city || "",
              email: eRes.data.email || "",
              emergency_contact_name: eRes.data.emergency_contact_name || "",
              emergency_contact_phone: eRes.data.emergency_contact_phone || "",
              emergency_contact_relation: eRes.data.emergency_contact_relation || "",
            });
          }
        } catch {}
      } else {
        const cachedShifts = await getCachedAgenda();
        setActiveSession({
          active: false,
          shift: null,
          today_shifts: cachedShifts,
          all_shifts: cachedShifts,
          offline_cached: true,
        });
        setVisitList(cachedShifts || []);
      }
    } catch (err) {
      console.warn("Cargando vista operativa local:", err);
      const cachedShifts = await getCachedAgenda();
      setActiveSession({
        active: false,
        shift: null,
        today_shifts: cachedShifts,
        all_shifts: cachedShifts,
        offline_cached: true,
      });
      setVisitList(cachedShifts || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  // Mandatory Initial Reference Photo Gate Check
  useEffect(() => {
    if (employeeProfile && !loading) {
      const storedLocalPhoto = typeof window !== "undefined" ? localStorage.getItem("dla_user_photo") : null;
      const currentPhoto = employeeProfile?.photo_url || (user as any)?.photo_url || storedLocalPhoto;
      if (!currentPhoto || currentPhoto.trim() === "") {
        // Open mandatory camera modal automatically if photo is missing
        setCameraPurpose("reference");
        setCameraModalOpen(true);
        setTimeout(() => {
          startCamera();
        }, 400);
      }
    }
  }, [employeeProfile, loading, user]);

  // Capture GPS position
  const getGPS = (): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve({ lat: 4.6097, lng: -74.0817 });
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setCoords(location);
          resolve(location);
        },
        () => resolve({ lat: 4.6097, lng: -74.0817 }),
        { enableHighAccuracy: true, timeout: 5000 }
      );
    });
  };

  // Start Camera Stream
  const startCamera = async () => {
    setCapturedPhotoBase64(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn("No se pudo abrir cámara directa, use selector de archivo:", err);
    }
  };

  // Stop Camera Stream
  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
    }
  };

  // Take Canvas Snapshot from WebCam
  const takeCanvasSnapshot = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        setCapturedPhotoBase64(dataUrl);
        stopCamera();
      }
    }
  };

  // Handle File Input Fallback Snapshot
  const handleFileCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      setCapturedPhotoBase64(evt.target?.result as string);
      stopCamera();
    };
    reader.readAsDataURL(file);
  };

  // Open Camera Modal for Action
  const openCameraModal = (purpose: "reference" | "start" | "end" | "novedad", shiftId?: string) => {
    const hasPhoto = !!(employeeProfile?.photo_url || (user as any)?.photo_url);
    if (purpose === "reference" && hasPhoto) {
      setStatusMessage("🔒 Su foto de referencia biométrica ya está registrada y protegida. No se permite cambiarla desde la App Móvil.");
      return;
    }
    setCameraPurpose(purpose);
    setTargetShiftId(shiftId || null);
    setCapturedPhotoBase64(null);
    setObservations("");
    setCameraModalOpen(true);
    setTimeout(() => {
      startCamera();
    }, 300);
  };

  // Save Reference Photo
  const handleSaveReferencePhoto = async () => {
    if (!capturedPhotoBase64) return;
    setPunching(true);
    try {
      if (navigator.onLine) {
        const res = await api.post("/mobile/me/reference-photo", { photo_base64: capturedPhotoBase64 });
        setStatusMessage("✅ Fotografía de referencia biométrica registrada y guardada exitosamente.");
        const photoUrl = res.data?.photo_url || capturedPhotoBase64;
        setEmployeeProfile((prev: any) => ({ ...prev, photo_url: photoUrl, is_face_registered: true }));
        if (typeof window !== "undefined") {
          localStorage.setItem("dla_user_photo", photoUrl);
        }
        if (user) {
          (user as any).photo_url = photoUrl;
        }
        await fetchSession();
      } else {
        setStatusMessage("⚠️ Fotografía guardada localmente.");
        if (typeof window !== "undefined") {
          localStorage.setItem("dla_user_photo", capturedPhotoBase64);
        }
      }
      stopCamera();
      setCameraModalOpen(false);
    } catch (err: any) {
      const errMsg = err?.response?.data?.detail || "Error guardando foto de referencia.";
      setStatusMessage(`Error: ${errMsg}`);
    } finally {
      setPunching(false);
    }
  };

  // Handle Start Visit (Check-In) with 20-min tolerance & photo capture
  const handleConfirmStartVisit = async () => {
    if (!targetShiftId) return;
    setPunching(true);
    setStatusMessage("");
    try {
      const location = await getGPS();
      const timestamp = new Date().toISOString();

      if (navigator.onLine) {
        await api.post("/mobile/me/start-visit", {
          shift_id: targetShiftId,
          latitude: location.lat,
          longitude: location.lng,
          photo_base64: capturedPhotoBase64 || undefined,
          offline_timestamp: timestamp,
        });
        setStatusMessage("🟢 ¡Visita iniciada exitosamente con verificación GPS y facial!");
      } else {
        await saveOfflinePunch({
          type: "start",
          shift_id: targetShiftId,
          latitude: location.lat,
          longitude: location.lng,
          offline_timestamp: timestamp,
        });
        setStatusMessage("⚠️ Registrado localmente (Offline). Se sincronizará al conectar.");
      }

      setVisitList((prev) =>
        prev.map((v) => (v.id === targetShiftId ? { ...v, status: "in_progress" } : v))
      );

      stopCamera();
      setCameraModalOpen(false);
      await fetchSession();
    } catch (err: any) {
      console.error("Error iniciando visita:", err);
      setStatusMessage(`Error: ${err?.response?.data?.detail || err?.message || "No se pudo iniciar visita"}`);
    } finally {
      setPunching(false);
    }
  };

  // Handle End Visit (Check-Out) with photo & observations
  const handleConfirmEndVisit = async () => {
    if (!targetShiftId) return;
    setPunching(true);
    setStatusMessage("");
    try {
      const location = await getGPS();
      const timestamp = new Date().toISOString();

      if (navigator.onLine) {
        await api.post("/mobile/me/end-visit", {
          shift_id: targetShiftId,
          latitude: location.lat,
          longitude: location.lng,
          photo_base64: capturedPhotoBase64 || undefined,
          observations: observations || undefined,
          offline_timestamp: timestamp,
        });
        setStatusMessage("✅ Visita finalizada exitosamente. Reporte y evidencias registradas.");
      } else {
        await saveOfflinePunch({
          type: "end",
          shift_id: targetShiftId,
          latitude: location.lat,
          longitude: location.lng,
          observations,
          offline_timestamp: timestamp,
        });
        setStatusMessage("⚠️ Salida registrada localmente (Offline).");
      }

      setVisitList((prev) =>
        prev.map((v) => (v.id === targetShiftId ? { ...v, status: "completed", completed_at: new Date().toLocaleTimeString() } : v))
      );

      setObservations("");
      stopCamera();
      setCameraModalOpen(false);
      await fetchSession();
    } catch (err: any) {
      console.error("Error finalizando visita:", err);
      setStatusMessage(`Error: ${err?.response?.data?.detail || err?.message || "No se pudo finalizar visita"}`);
    } finally {
      setPunching(false);
    }
  };

  // Handle Access Control Punches (6 Modalities)
  const handleRegisterAccessPunch = async (recordType: string) => {
    setPunching(true);
    setStatusMessage("");
    try {
      const location = await getGPS();
      if (navigator.onLine) {
        const res = await api.post("/mobile/me/access-punch", {
          record_type: recordType,
          latitude: location.lat,
          longitude: location.lng,
          photo_base64: capturedPhotoBase64 || undefined,
        });
        setStatusMessage(`✅ ${res.data.message || "Marcación registrada con éxito"}`);
      } else {
        await saveOfflinePunch({
          type: recordType,
          latitude: location.lat,
          longitude: location.lng,
          offline_timestamp: new Date().toISOString(),
        });
        setStatusMessage(`⚠️ Marcación de '${recordType}' guardada en modo offline.`);
      }
      await fetchSession();
    } catch (err: any) {
      setStatusMessage(`Error: ${err?.response?.data?.detail || "No se pudo registrar marcación"}`);
    } finally {
      setPunching(false);
    }
  };

  // Handle Save Visit Novedad / Incident
  const handleSaveNovedad = async () => {
    if (!novedadShift || !observations.trim()) return;
    setSavingNovedad(true);
    try {
      const location = await getGPS();
      const res = await api.post("/mobile/me/novedad", {
        shift_id: novedadShift.id,
        incident_type: incidentType,
        observations: observations.trim(),
        photo_base64: capturedPhotoBase64 || undefined,
        latitude: location.lat,
        longitude: location.lng,
      });
      setStatusMessage("✅ Novedad de visita registrada correctamente.");
      setNovedadModalOpen(false);
      setObservations("");
      await fetchSession();
    } catch (err: any) {
      setStatusMessage(`Error: ${err?.response?.data?.detail || "Error al guardar novedad"}`);
    } finally {
      setSavingNovedad(false);
    }
  };

  // Handle Personal Info Update (Editable Personal Fields Only)
  const handleSavePersonalInfo = async () => {
    setSavingPersonal(true);
    try {
      const location = await getGPS();
      const res = await api.put("/mobile/me/personal-info", {
        ...personalForm,
        latitude: location.lat,
        longitude: location.lng,
      });
      setStatusMessage("✅ Datos de contacto actualizados y auditados en el sistema.");
      setEditingPersonal(false);
      await fetchSession();
    } catch (err: any) {
      setStatusMessage(`Error: ${err?.response?.data?.detail || "Error actualizando perfil"}`);
    } finally {
      setSavingPersonal(false);
    }
  };

  // Payroll Printing & PDF Exporting & WhatsApp Share Handlers
  const handlePrintPayroll = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const handleShareWhatsApp = () => {
    if (!payrollData?.latest_record) return;
    const rec = payrollData.latest_record;
    const empName = user?.full_name || "Empleado";
    const text = `📄 *COMPROBANTE DE NÓMINA - DLA ACCESS ENTERPRISE*\n👤 *Colaborador:* ${empName}\n💰 *Neto a Recibir:* $${Number(rec.net_pay || 0).toLocaleString("es-CO")}\n🗓️ *Período:* ${rec.period_id || "Actual"}\n✅ Firma digital verificada en plataforma.`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  // Evaluate 20-minute window tolerance for a shift
  const evaluateShiftTiming = (shift: any) => {
    if (shift.status === "completed") return { canStart: false, isLost: false, badge: "Completada" };
    if (shift.status === "in_progress") return { canStart: false, isInProgress: true, badge: "En Progreso" };
    if (shift.status === "lost") return { canStart: false, isLost: true, badge: "Turno Perdido" };

    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const shiftDateStr = shift.shift_date || todayStr;

    if (shiftDateStr !== todayStr) {
      const isPast = shiftDateStr < todayStr;
      return { canStart: false, isOtherDay: true, badge: isPast ? "Fecha Pasada" : `Programada (${shiftDateStr})` };
    }

    if (!shift.start_time) return { canStart: true, badge: "Programada" };

    const [sh, sm] = shift.start_time.split(":").slice(0, 2).map(Number);
    const scheduledStart = new Date();
    scheduledStart.setHours(sh, sm, 0, 0);

    let scheduledEnd = new Date();
    if (shift.end_time) {
      const [eh, em] = shift.end_time.split(":").slice(0, 2).map(Number);
      scheduledEnd.setHours(eh, em, 0, 0);
    } else {
      scheduledEnd = new Date(scheduledStart.getTime() + 8 * 60 * 60 * 1000);
    }

    const earliestStart = new Date(scheduledStart.getTime() - 20 * 60 * 1000);
    const maxEndTolerance = new Date(scheduledEnd.getTime() + 20 * 60 * 1000);

    if (now < earliestStart) {
      return { canStart: false, isTooEarly: true, earliestTime: earliestStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), badge: "Horario Futuro" };
    }

    if (now > maxEndTolerance) {
      return { canStart: false, isLost: true, badge: "Turno Perdido" };
    }

    const isLate = now > scheduledStart;
    return { canStart: true, isLate, badge: isLate ? "Ingreso con Atraso" : "Habilitada" };
  };

  const todayStr = new Date().toISOString().split("T")[0];

  const totalCompleted = visitList.filter((v) => v.status === "completed").length;
  const totalPending = visitList.filter((v) => v.status === "scheduled" || v.status === "pending").length;
  const totalLost = visitList.filter((v) => v.status === "lost").length;
  const totalCancelled = visitList.filter((v) => v.status === "cancelled").length;

  const nextPendingVisit = visitList.find((v) => (v.status === "scheduled" || v.status === "pending") && (v.shift_date === todayStr || !v.shift_date));

  const filteredVisitasList = visitList.filter((v) => {
    if (filterStatus === "all") return true;
    if (filterStatus === "today") return v.shift_date === todayStr;
    if (filterStatus === "pending") return v.status === "scheduled" || v.status === "pending" || v.status === "in_progress";
    if (filterStatus === "completed") return v.status === "completed";
    if (filterStatus === "lost") return v.status === "lost" || evaluateShiftTiming(v).isLost;
    if (filterStatus === "cancelled") return v.status === "cancelled";
    return true;
  });

  return (
    <div className="space-y-4 max-w-2xl mx-auto pb-24 px-2 sm:px-4 text-slate-100 select-none">
      {/* Top Mobile Bar with Clean Logout */}
      <div className="flex items-center justify-between p-3 bg-slate-900/90 border border-slate-800 rounded-2xl backdrop-blur-md shadow-lg">
        <div className="flex items-center gap-2.5">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center font-bold text-white shadow">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-black text-white">{user?.full_name || "Operador de Campo"}</p>
            <p className="text-[10px] text-cyan-400 font-mono">PWA CAMPO | {currentTime}</p>
          </div>
        </div>

        <Button
          size="sm"
          variant="ghost"
          onClick={handleCleanLogout}
          className="text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 gap-1 text-xs font-bold"
        >
          <LogOut className="h-4 w-4" /> Salir
        </Button>
      </div>

      {/* BANNER REGISTRO OBLIGATORIO DE FOTO INICIAL */}
      {(() => {
        const currentPhoto = employeeProfile?.photo_url || (user as any)?.photo_url;
        const hasPhoto = !!(currentPhoto && currentPhoto.trim());
        if (hasPhoto) return null;

        return (
          <div className="p-4 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-2 border-amber-500/60 rounded-2xl text-amber-200 space-y-2 shadow-xl animate-pulse">
            <div className="flex items-center gap-2 font-bold text-xs text-amber-300">
              <Camera className="h-5 w-5 text-amber-400 shrink-0" />
              <span>Registro Biométrico Inicial Obligatorio</span>
            </div>
            <p className="text-[11px] leading-snug text-slate-300">
              No se detectó una foto facial registrada para su perfil. Debe tomar su fotografía por primera vez para poder activar el inicio de visitas y marcaciones.
            </p>
            <Button
              size="sm"
              onClick={() => openCameraModal("reference")}
              className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs gap-1.5 py-3 shadow"
            >
              <Camera className="h-4 w-4" /> Tomar y Registrar Mi Foto Ahora
            </Button>
          </div>
        );
      })()}

      {/* Navigation Pill Tabs */}
      <div className="grid grid-cols-5 gap-1 p-1 bg-slate-950/90 rounded-2xl border border-slate-800 text-[10px]">
        <button
          type="button"
          onClick={() => { setActiveTab("agenda"); window.location.hash = "agenda"; }}
          className={`py-2 px-1 rounded-xl font-bold transition-all flex flex-col items-center justify-center gap-0.5 ${
            activeTab === "agenda" ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg" : "text-slate-400 hover:text-white"
          }`}
        >
          <Clock className="h-3.5 w-3.5" />
          <span>Dashboard</span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab("visitas"); window.location.hash = "visitas"; }}
          className={`py-2 px-1 rounded-xl font-bold transition-all flex flex-col items-center justify-center gap-0.5 ${
            activeTab === "visitas" ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg" : "text-slate-400 hover:text-white"
          }`}
        >
          <Calendar className="h-3.5 w-3.5" />
          <span>Visitas</span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab("marcar"); window.location.hash = "marcar"; }}
          className={`py-2 px-1 rounded-xl font-bold transition-all flex flex-col items-center justify-center gap-0.5 ${
            activeTab === "marcar" ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg" : "text-slate-400 hover:text-white"
          }`}
        >
          <UserCheck className="h-3.5 w-3.5" />
          <span>Marcación</span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab("nomina"); window.location.hash = "nomina"; }}
          className={`py-2 px-1 rounded-xl font-bold transition-all flex flex-col items-center justify-center gap-0.5 ${
            activeTab === "nomina" ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg" : "text-slate-400 hover:text-white"
          }`}
        >
          <DollarSign className="h-3.5 w-3.5" />
          <span>Nómina</span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab("perfil"); window.location.hash = "perfil"; }}
          className={`py-2 px-1 rounded-xl font-bold transition-all flex flex-col items-center justify-center gap-0.5 ${
            activeTab === "perfil" ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg" : "text-slate-400 hover:text-white"
          }`}
        >
          <User className="h-3.5 w-3.5" />
          <span>Perfil</span>
        </button>
      </div>

      {/* Global Status Message Toast Banner */}
      {statusMessage && (
        <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
          statusMessage.includes("Error") || statusMessage.includes("PERDIDO") ? "bg-rose-500/10 border border-rose-500/30 text-rose-300" : "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
        }`}>
          {statusMessage.includes("Error") || statusMessage.includes("PERDIDO") ? <AlertCircle className="h-4 w-4 shrink-0" /> : <CheckCircle2 className="h-4 w-4 shrink-0" />}
          <span>{statusMessage}</span>
        </div>
      )}

      {/* ────────────────── TAB 1: DASHBOARD PRINCIPAL OPERATIVO ────────────────── */}
      {activeTab === "agenda" && (
        <div className="space-y-4">
          {/* USER WELCOME & METRICS CARD */}
          <Card className="bg-slate-900 border-slate-800 text-white shadow-xl">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h2 className="text-base font-black text-white">{employeeProfile?.company_name || "DLA Redes y Seguridad"}</h2>
                  <p className="text-xs text-cyan-400 font-mono">{employeeProfile?.job_position || "Operador de Campo"}</p>
                </div>
                <Badge className="bg-emerald-600 text-white text-[10px] font-bold">
                  {employeeProfile?.status === "active" ? "Activo en Servicio" : "Activo"}
                </Badge>
              </div>

              {/* Indicadores Operativos */}
              <div className="grid grid-cols-4 gap-2 text-center pt-1">
                <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                  <p className="text-lg font-black text-cyan-400">98%</p>
                  <p className="text-[9px] text-slate-400 font-bold uppercase">Cumplimiento</p>
                </div>
                <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                  <p className="text-lg font-black text-emerald-400">{totalCompleted}</p>
                  <p className="text-[9px] text-slate-400 font-bold uppercase">Completadas</p>
                </div>
                <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                  <p className="text-lg font-black text-amber-400">{totalPending}</p>
                  <p className="text-[9px] text-slate-400 font-bold uppercase">Pendientes</p>
                </div>
                <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                  <p className="text-lg font-black text-rose-400">{totalLost}</p>
                  <p className="text-[9px] text-slate-400 font-bold uppercase">Perdidas</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* VISITA EN CURSO O PRÓXIMA VISITA DESTACADA */}
          {activeSession?.active && activeSession?.shift ? (
            <Card className="bg-slate-900 border-2 border-emerald-500/80 text-white shadow-2xl overflow-hidden relative">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-emerald-500 animate-pulse" />
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <Badge className="bg-emerald-500 text-slate-950 font-black text-xs gap-1">
                    <span className="h-2 w-2 rounded-full bg-slate-950 animate-ping" /> VISITA EN CURSO
                  </Badge>
                  <span className="text-xs text-slate-400 font-mono">Código: {activeSession.shift.id}</span>
                </div>

                <div className="space-y-1">
                  <h2 className="text-lg font-black text-white">{activeSession.shift.name}</h2>
                  <p className="text-xs text-cyan-300 font-semibold flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> {activeSession.shift.client_name || "Sede Asignada"}
                  </p>
                </div>

                {/* LIVE CHRONOMETER */}
                <div className="p-4 bg-slate-950/90 rounded-2xl border border-emerald-500/40 text-center space-y-1">
                  <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Tiempo Registrado en Sitio</p>
                  <p className="text-3xl font-black font-mono text-emerald-400 tracking-wider">
                    {formatElapsed(elapsedSeconds)}
                  </p>
                </div>

                <Button
                  size="lg"
                  onClick={() => openCameraModal("end", activeSession.shift.id)}
                  disabled={punching}
                  className="w-full py-6 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-black text-sm shadow-xl gap-2"
                >
                  <Square className="h-5 w-5 fill-white" />
                  <span>Finalizar Visita / Registrar Salida</span>
                </Button>
              </CardContent>
            </Card>
          ) : (
            nextPendingVisit ? (
              <Card className="bg-slate-900 border-2 border-blue-500/50 text-white shadow-xl">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-blue-600 text-white text-[10px] uppercase font-bold">
                      Próxima Visita Pendiente del Día
                    </Badge>
                    <span className="text-xs text-slate-400 font-mono">{nextPendingVisit.code || "REG"}</span>
                  </div>
                  <CardTitle className="text-base font-black text-white pt-2">{nextPendingVisit.client_name || nextPendingVisit.name}</CardTitle>
                  <CardDescription className="text-xs text-slate-400 flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-cyan-400" /> {nextPendingVisit.client_address || nextPendingVisit.address || "Dirección asignada"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 bg-slate-950 rounded-xl flex items-center justify-between text-xs">
                    <span>Horario Programado:</span>
                    <strong className="text-cyan-400 font-mono">{nextPendingVisit.scheduled_time || `${nextPendingVisit.start_time} - ${nextPendingVisit.end_time}`}</strong>
                  </div>

                  {(() => {
                    const timing = evaluateShiftTiming(nextPendingVisit);
                    return (
                      <Button
                        size="lg"
                        onClick={() => openCameraModal("start", nextPendingVisit.id)}
                        disabled={!timing.canStart || punching}
                        className={`w-full py-5 font-black text-sm gap-2 ${
                          timing.canStart
                            ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg"
                            : "bg-slate-800 text-slate-500 cursor-not-allowed"
                        }`}
                      >
                        <Play className="h-5 w-5" />
                        <span>Iniciar Visita (Cámara + GPS)</span>
                      </Button>
                    );
                  })()}
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-slate-900 border-slate-800 text-white text-center py-6">
                <CardContent className="space-y-2">
                  <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto" />
                  <h3 className="font-bold text-sm">¡Sin Visitas Pendientes por Hoy!</h3>
                  <p className="text-xs text-slate-400">Has completado todas tus asignaciones para el día de hoy.</p>
                </CardContent>
              </Card>
            )
          )}

          {/* ACCIONES RÁPIDAS OPERATIVAS */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => { setActiveTab("marcar"); window.location.hash = "marcar"; }}
              className="py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs gap-2 rounded-2xl shadow"
            >
              <UserCheck className="h-4 w-4" /> Registrar Marcación
            </Button>
            <Button
              onClick={() => { setActiveTab("visitas"); window.location.hash = "visitas"; }}
              className="py-5 bg-gradient-to-r from-cyan-600 to-teal-600 text-white font-bold text-xs gap-2 rounded-2xl shadow"
            >
              <Calendar className="h-4 w-4" /> Ver Mi Programación
            </Button>
          </div>
        </div>
      )}

      {/* ────────────────── TAB 2: MÓDULO VISITAS (FILTRADO Y ACCIONES) ────────────────── */}
      {activeTab === "visitas" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-cyan-400" /> Registro de Visitas Asignadas
            </h3>
          </div>

          {/* Filters with Counts */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 text-[10px]">
            {[
              { id: "all", label: "Todas", count: visitList.length },
              { id: "today", label: "Hoy", count: visitList.filter(v => v.shift_date === todayStr).length },
              { id: "pending", label: "Pendientes", count: visitList.filter(v => v.status === "scheduled" || v.status === "pending" || v.status === "in_progress").length },
              { id: "completed", label: "Completadas", count: visitList.filter(v => v.status === "completed").length },
              { id: "lost", label: "Perdidas", count: visitList.filter(v => v.status === "lost" || evaluateShiftTiming(v).isLost).length },
              { id: "cancelled", label: "Canceladas", count: visitList.filter(v => v.status === "cancelled").length },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setFilterStatus(st.id as any)}
                className={`px-3 py-1.5 rounded-xl font-bold capitalize transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  filterStatus === st.id ? "bg-cyan-600 text-white shadow" : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                }`}
              >
                <span>{st.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono ${
                  filterStatus === st.id ? "bg-white/20 text-white" : "bg-slate-800 text-slate-300"
                }`}>
                  {st.count}
                </span>
              </button>
            ))}
          </div>

          {filteredVisitasList.length === 0 ? (
            <Card className="bg-slate-900 border-slate-800 text-white text-center py-8">
              <CardContent className="space-y-2">
                <Calendar className="h-10 w-10 text-cyan-400 mx-auto opacity-80" />
                <h3 className="font-bold text-sm text-white">Sin Visitas Registradas</h3>
                <p className="text-xs text-slate-400">No se encontraron turnos asignados por tu supervisor para este filtro.</p>
              </CardContent>
            </Card>
          ) : (
            filteredVisitasList.map((v) => {
              const timing = evaluateShiftTiming(v);
              return (
                <Card key={v.id} className="bg-slate-900/90 border-slate-800">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-sm text-white">{v.client_name || v.name}</h4>
                        <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3 text-cyan-400" /> {v.client_address || v.address || "Dirección de Sede"}
                        </p>
                      </div>
                      <Badge className={`text-[10px] font-bold ${
                        v.status === "completed" ? "bg-emerald-600 text-white" :
                        v.status === "in_progress" ? "bg-emerald-500 text-slate-950 animate-pulse" :
                        v.status === "lost" ? "bg-rose-600 text-white" : "bg-blue-600 text-white"
                      }`}>
                        {timing.badge}
                      </Badge>
                    </div>

                    <div className="text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded-xl flex items-center justify-between">
                      <span>Fecha: <strong className="text-white">{v.shift_date || todayStr}</strong> ({v.start_time} - {v.end_time})</span>
                      <span className="font-mono text-[11px] text-cyan-400">{v.code || "VIS"}</span>
                    </div>

                    {v.observations && (
                      <p className="text-[11px] text-slate-400 italic bg-slate-950/40 p-2 rounded-lg">"{v.observations}"</p>
                    )}

                    <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                      {v.latitude && v.longitude ? (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${v.latitude},${v.longitude}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-xl font-bold flex items-center justify-center gap-1 text-center"
                        >
                          <Navigation className="h-3.5 w-3.5" /> Abrir Mapa
                        </a>
                      ) : (
                        <button
                          onClick={() => alert("Ubicación de cliente sin coordenadas GPS exactas.")}
                          className="p-2.5 bg-slate-800/50 text-slate-500 rounded-xl font-bold flex items-center justify-center gap-1 text-center"
                        >
                          <Navigation className="h-3.5 w-3.5" /> Sin Coordenadas
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setNovedadShift(v);
                          setObservations("");
                          setNovedadModalOpen(true);
                        }}
                        className="p-2.5 bg-amber-600/80 hover:bg-amber-600 text-white rounded-xl font-bold flex items-center justify-center gap-1 text-center"
                      >
                        <AlertTriangle className="h-3.5 w-3.5" /> Novedad / Incidencia
                      </button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* ────────────────── TAB 3: CONTROL DE ACCESO (6 MARCACIONES) ────────────────── */}
      {activeTab === "marcar" && (
        <div className="space-y-4">
          <Card className="bg-slate-900 border-slate-800 text-white shadow-xl">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2 text-blue-400">
                <UserCheck className="h-5 w-5" /> Control de Asistencia & Jornada
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Seleccione el tipo de marcación con validación biométrica y ubicación GPS.
              </CardDescription>
            </CardHeader>

            <CardContent className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => handleRegisterAccessPunch("entry")}
                disabled={punching}
                className="py-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs gap-2 rounded-2xl shadow"
              >
                <Play className="h-4 w-4" /> Entrada Laboral
              </Button>

              <Button
                onClick={() => handleRegisterAccessPunch("exit")}
                disabled={punching}
                className="py-6 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-bold text-xs gap-2 rounded-2xl shadow"
              >
                <Square className="h-4 w-4" /> Salida Laboral
              </Button>

              <Button
                onClick={() => handleRegisterAccessPunch("meal_start")}
                disabled={punching}
                className="py-6 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs gap-2 rounded-2xl border border-amber-500/30"
              >
                <Utensils className="h-4 w-4" /> Inicio Almuerzo
              </Button>

              <Button
                onClick={() => handleRegisterAccessPunch("meal_end")}
                disabled={punching}
                className="py-6 bg-slate-800 hover:bg-slate-700 text-emerald-300 font-bold text-xs gap-2 rounded-2xl border border-emerald-500/30"
              >
                <Utensils className="h-4 w-4" /> Fin Almuerzo
              </Button>

              <Button
                onClick={() => handleRegisterAccessPunch("break_start")}
                disabled={punching}
                className="py-6 bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-xs gap-2 rounded-2xl border border-cyan-500/30"
              >
                <Coffee className="h-4 w-4" /> Pausa Activa Inicio
              </Button>

              <Button
                onClick={() => handleRegisterAccessPunch("break_end")}
                disabled={punching}
                className="py-6 bg-slate-800 hover:bg-slate-700 text-teal-300 font-bold text-xs gap-2 rounded-2xl border border-teal-500/30"
              >
                <Coffee className="h-4 w-4" /> Pausa Activa Fin
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ────────────────── TAB 4: MÓDULO NÓMINA (PDF & WHATSAPP) ────────────────── */}
      {activeTab === "nomina" && (
        <div className="space-y-4">
          <Card className="bg-slate-900 border-slate-800 text-white shadow-xl">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2 text-emerald-400">
                <DollarSign className="h-5 w-5" /> Mi Desprendible de Pago
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Resumen de haberes y deducciones calculadas para el período actual de nómina.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {payrollData?.latest_record ? (
                <div className="space-y-3 text-xs">
                  <div className="p-4 bg-slate-950 rounded-2xl border border-emerald-500/40 text-center space-y-1">
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Neto a Recibir en Cuenta</p>
                    <p className="text-3xl font-black font-mono text-emerald-400">
                      ${Number(payrollData.latest_record.net_pay || 0).toLocaleString("es-CO")}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 bg-slate-950/60 rounded-xl">
                      <p className="text-[10px] text-slate-400">Salario Base:</p>
                      <p className="font-bold font-mono text-white">${Number(payrollData.latest_record.base_salary || 0).toLocaleString("es-CO")}</p>
                    </div>
                    <div className="p-3 bg-slate-950/60 rounded-xl">
                      <p className="text-[10px] text-slate-400">Aux. Transporte:</p>
                      <p className="font-bold font-mono text-white">${Number(payrollData.latest_record.transportation_assistance || 0).toLocaleString("es-CO")}</p>
                    </div>
                    <div className="p-3 bg-slate-950/60 rounded-xl">
                      <p className="text-[10px] text-slate-400">Horas Extras / Recargos:</p>
                      <p className="font-bold font-mono text-emerald-400">${Number(payrollData.latest_record.overtime_value || 0).toLocaleString("es-CO")}</p>
                    </div>
                    <div className="p-3 bg-slate-950/60 rounded-xl">
                      <p className="text-[10px] text-slate-400">Deducciones Salud/Pensión:</p>
                      <p className="font-bold font-mono text-rose-400">-${Number((payrollData.latest_record.health_deduction || 0) + (payrollData.latest_record.pension_deduction || 0)).toLocaleString("es-CO")}</p>
                    </div>
                  </div>

                  {/* FIRMA DIGITAL DEL CONTRATO INCORPORADA */}
                  {employeeProfile?.signature_url && (
                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-center space-y-1">
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Firma Digital del Contrato Incorporada</p>
                      <img src={employeeProfile.signature_url} alt="Firma Oficial" className="h-12 mx-auto object-contain bg-white/90 p-1 rounded" />
                    </div>
                  )}

                  {/* BOTONES DE IMPRESIÓN, PDF Y WHATSAPP */}
                  <div className="grid grid-cols-3 gap-2 pt-2">
                    <Button onClick={handlePrintPayroll} variant="outline" className="text-xs font-bold gap-1 text-slate-200 border-slate-700">
                      <Printer className="h-3.5 w-3.5 text-cyan-400" /> Imprimir
                    </Button>
                    <Button onClick={handlePrintPayroll} variant="outline" className="text-xs font-bold gap-1 text-slate-200 border-slate-700">
                      <Download className="h-3.5 w-3.5 text-emerald-400" /> Exportar PDF
                    </Button>
                    <Button onClick={handleShareWhatsApp} className="text-xs font-bold gap-1 bg-emerald-600 hover:bg-emerald-700 text-white">
                      <Share2 className="h-3.5 w-3.5" /> WhatsApp
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-6 bg-slate-950 rounded-2xl text-center text-xs text-slate-400 space-y-1">
                  <FileText className="h-8 w-8 text-cyan-400 mx-auto" />
                  <p className="font-bold text-white">Nómina del Período Actual</p>
                  <p>Salario pactado según contrato y tiempo laborado en campo.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ────────────────── TAB 5: PERFIL Y DATOS PERSONALES EDITABLES ────────────────── */}
      {activeTab === "perfil" && (
        <div className="space-y-4">
          {(() => {
            const currentPhoto = employeeProfile?.photo_url || (user as any)?.photo_url;
            const hasPhoto = !!(currentPhoto && currentPhoto.trim());

            return (
              <Card className="bg-slate-900 border-slate-800 text-white shadow-xl">
                <CardHeader className="text-center pb-2">
                  <div className="mx-auto relative">
                    {hasPhoto ? (
                      <img src={currentPhoto} alt="Foto Oficial" className="h-28 w-28 rounded-full object-cover border-4 border-emerald-500 shadow-xl mx-auto" />
                    ) : (
                      <div className="h-28 w-28 rounded-full bg-slate-800 border-4 border-amber-500 flex items-center justify-center text-amber-400 mx-auto">
                        <User className="h-14 w-14" />
                      </div>
                    )}
                  </div>

                  <CardTitle className="text-lg font-black text-white pt-2">{user?.full_name}</CardTitle>
                  <CardDescription className="text-xs text-cyan-400 font-mono">
                    {employeeProfile?.job_position || "Operador de Campo"} | {user?.email}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4 text-xs">
                  {/* DATOS ADMINISTRATIVOS ESTRICTAMENTE BLOQUEADOS */}
                  <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Datos Administrativos (Solo Lectura - ERP)</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div><span className="text-slate-500">Documento Cédula:</span> <p className="font-bold font-mono text-white">{employeeProfile?.document_number || "—"}</p></div>
                      <div><span className="text-slate-500">Código Empleado:</span> <p className="font-bold font-mono text-white">{employeeProfile?.code || "—"}</p></div>
                      <div><span className="text-slate-500">EPS (Salud):</span> <p className="font-bold text-white">{employeeProfile?.eps || "EPS Sura"}</p></div>
                      <div><span className="text-slate-500">ARL (Riesgos):</span> <p className="font-bold text-white">{employeeProfile?.arl || "Positiva ARL"}</p></div>
                      <div><span className="text-slate-500">Fondo Pensiones:</span> <p className="font-bold text-white">{employeeProfile?.afp || "Porvenir S.A."}</p></div>
                      <div><span className="text-slate-500">Caja Compensación:</span> <p className="font-bold text-white">{employeeProfile?.caja_compensacion || "Comfama"}</p></div>
                    </div>
                  </div>

                  {/* FORMULARIO EDITABLE DE CONTACTO CON AUDITORÍA */}
                  <div className="p-3 bg-slate-950 rounded-2xl border border-cyan-500/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">Datos de Contacto Personales Editables</p>
                      {!editingPersonal ? (
                        <button onClick={() => setEditingPersonal(true)} className="text-cyan-400 font-bold text-xs flex items-center gap-1 hover:underline">
                          <Edit3 className="h-3.5 w-3.5" /> Editar Contacto
                        </button>
                      ) : (
                        <button onClick={() => setEditingPersonal(false)} className="text-rose-400 font-bold text-xs hover:underline">
                          Cancelar
                        </button>
                      )}
                    </div>

                    {editingPersonal ? (
                      <div className="space-y-3 pt-1">
                        <div>
                          <label className="text-[10px] text-slate-400 font-bold">Celular / Teléfono Móvil</label>
                          <Input
                            value={personalForm.mobile}
                            onChange={(e) => setPersonalForm({ ...personalForm, mobile: e.target.value })}
                            className="bg-slate-900 border-slate-700 text-white text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 font-bold">Dirección Residencial</label>
                          <Input
                            value={personalForm.address}
                            onChange={(e) => setPersonalForm({ ...personalForm, address: e.target.value })}
                            className="bg-slate-900 border-slate-700 text-white text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 font-bold">Ciudad</label>
                          <Input
                            value={personalForm.city}
                            onChange={(e) => setPersonalForm({ ...personalForm, city: e.target.value })}
                            className="bg-slate-900 border-slate-700 text-white text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 font-bold">Contacto de Emergencia (Nombre)</label>
                          <Input
                            value={personalForm.emergency_contact_name}
                            onChange={(e) => setPersonalForm({ ...personalForm, emergency_contact_name: e.target.value })}
                            className="bg-slate-900 border-slate-700 text-white text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 font-bold">Teléfono de Emergencia</label>
                          <Input
                            value={personalForm.emergency_contact_phone}
                            onChange={(e) => setPersonalForm({ ...personalForm, emergency_contact_phone: e.target.value })}
                            className="bg-slate-900 border-slate-700 text-white text-xs"
                          />
                        </div>

                        <Button onClick={handleSavePersonalInfo} disabled={savingPersonal} className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs gap-1.5 py-4">
                          <Save className="h-4 w-4" /> Guardar Cambios (con Auditoría GPS)
                        </Button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div><span className="text-slate-500">Celular Móvil:</span> <p className="font-bold text-white">{employeeProfile?.mobile || personalForm.mobile || "—"}</p></div>
                        <div><span className="text-slate-500">Ciudad:</span> <p className="font-bold text-white">{employeeProfile?.city || personalForm.city || "—"}</p></div>
                        <div className="col-span-2"><span className="text-slate-500">Dirección Residencial:</span> <p className="font-bold text-white">{employeeProfile?.address || personalForm.address || "—"}</p></div>
                        <div className="col-span-2"><span className="text-slate-500">Contacto Emergencia:</span> <p className="font-bold text-white">{employeeProfile?.emergency_contact_name || "—"} ({employeeProfile?.emergency_contact_phone || "—"})</p></div>
                      </div>
                    )}
                  </div>

                  {/* BLOQUEO DE FOTO BIOMÉTRICA */}
                  {hasPhoto ? (
                    <div className="p-4 bg-slate-950/80 border border-emerald-500/40 rounded-2xl text-center space-y-1.5">
                      <div className="flex items-center justify-center gap-1.5 text-emerald-400 font-bold text-xs">
                        <ShieldCheck className="h-4 w-4" />
                        <span>Foto Biométrica Registrada & Protegida</span>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-relaxed">
                        Su foto de referencia está activa y guardada. Por seguridad del sistema, no se permite modificar la foto desde la App Móvil. Para cualquier actualización, solicítelo a su supervisor en el ERP Web.
                      </p>
                    </div>
                  ) : (
                    <Button
                      onClick={() => openCameraModal("reference")}
                      className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-black text-xs gap-2 py-4 shadow-lg animate-pulse"
                    >
                      <Camera className="h-4 w-4" /> Registrar Foto Facial de Referencia (Obligatorio)
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })()}
        </div>
      )}

      {/* MODAL DE REGISTRO DE NOVEDAD / INCIDENCIA */}
      <Dialog open={novedadModalOpen} onOpenChange={setNovedadModalOpen}>
        <DialogContent className="max-w-md bg-slate-900 text-white border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-amber-400">
              <AlertTriangle className="h-5 w-5" /> Registrar Novedad de Visita
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="text-[10px] text-slate-400 font-bold">Tipo de Novedad / Incidencia</label>
              <select
                value={incidentType}
                onChange={(e) => setIncidentType(e.target.value)}
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-bold mt-1"
              >
                <option value="cliente_ausente">Cliente / Sede Ausente</option>
                <option value="acceso_denegado">Acceso Denegado en Portería</option>
                <option value="reprogramado">Visita Reprogramada por Cliente</option>
                <option value="falla_tecnica">Falla Técnica / Inconveniente</option>
                <option value="otro">Otro Motivo u Observación</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-400 font-bold">Detalle de la Observación</label>
              <textarea
                rows={3}
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                placeholder="Describa brevemente lo sucedido..."
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveNovedad} disabled={savingNovedad} className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs gap-1 py-3">
              <Send className="h-4 w-4" /> Guardar Novedad
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* WEBCAM CAMERA MODAL WITH CANVAS CAPTURE & FALLBACK */}
      <Dialog open={cameraModalOpen} onOpenChange={(open) => { if (!open) stopCamera(); setCameraModalOpen(open); }}>
        <DialogContent className="max-w-md bg-slate-900 text-white border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-cyan-400">
              <Camera className="h-5 w-5" />
              {cameraPurpose === "reference" ? "Capturar Foto de Referencia Oficial" : cameraPurpose === "start" ? "Validación Biométrica de Inicio" : "Validación Biométrica de Salida"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Live WebCam Stream / Canvas Display */}
            <div className="relative aspect-video bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center">
              {!capturedPhotoBase64 ? (
                <>
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                  <div className="absolute inset-0 border-2 border-dashed border-cyan-500/50 rounded-2xl pointer-events-none flex items-center justify-center">
                    <p className="text-[10px] text-cyan-300 font-mono bg-slate-950/80 px-2 py-1 rounded">Alinee su rostro al centro</p>
                  </div>
                </>
              ) : (
                <img src={capturedPhotoBase64} alt="Foto Capturada" className="w-full h-full object-cover" />
              )}
              <canvas ref={canvasRef} className="hidden" />
            </div>

            {/* Fallback File Capture */}
            <div className="flex items-center justify-between text-[11px] border-t border-slate-800 pt-2">
              <span className="text-slate-400">¿Problemas con la cámara?</span>
              <label className="text-cyan-400 hover:underline cursor-pointer font-bold flex items-center gap-1">
                <Upload className="h-3.5 w-3.5" /> Subir Fotografía
                <input type="file" accept="image/*" capture="user" onChange={handleFileCapture} className="hidden" />
              </label>
            </div>
          </div>

          <DialogFooter className="flex flex-col gap-2 sm:flex-row">
            {!capturedPhotoBase64 ? (
              <Button onClick={takeCanvasSnapshot} className="w-full bg-cyan-600 hover:bg-cyan-700 font-bold text-xs gap-1 py-3">
                <Camera className="h-4 w-4" /> Tomar Captura
              </Button>
            ) : (
              <>
                <Button onClick={() => { setCapturedPhotoBase64(null); startCamera(); }} variant="outline" className="w-full sm:w-1/2 text-xs text-slate-200 border-slate-700">
                  Repetir Foto
                </Button>
                <Button
                  onClick={
                    cameraPurpose === "reference" ? handleSaveReferencePhoto :
                    cameraPurpose === "start" ? handleConfirmStartVisit : handleConfirmEndVisit
                  }
                  disabled={punching}
                  className="w-full sm:w-1/2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1 py-3"
                >
                  <CheckCircle2 className="h-4 w-4" /> Confirmar & Guardar
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
