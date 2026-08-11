"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { useSystemConfig } from "@/lib/useSystemConfig";
import { usePWA } from "@/hooks/usePWA";
import dynamic from "next/dynamic";
import { saveOfflinePunch, getCachedAgenda, saveCachedAgenda } from "@/lib/offlineStore";

const FaceScanOverlay = dynamic(() => import("./FaceScanOverlay"), { ssr: false });
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import SignatureCanvas from "react-signature-canvas";
import {
  Clock, MapPin, Camera, CheckCircle2, AlertCircle, RefreshCw,
  LogOut, Play, Square, ShieldCheck, UserCheck, PhoneCall, AlertTriangle,
  FileText, Upload, User, DollarSign, Calendar, Share2, Printer, Download,
  Edit3, Save, Coffee, Utensils, Navigation, ExternalLink, Send, ShieldAlert, Check, Moon, Sun, Monitor
} from "lucide-react";
import { CuentaDeCobroTemplate } from "@/components/payroll/CuentaDeCobroTemplate";

export default function MobileShiftView() {
  const html2pdf = typeof window !== "undefined" ? require("html2pdf.js") : null;
  const { user, logout, loadUser } = useAuthStore();
  const { theme, toggleTheme } = useUIStore();
  const { isOnline, pendingCount, isSyncing, triggerSync } = usePWA();
  const router = useRouter();

  const { configs } = useSystemConfig();
  const companyLogo = configs.find(c => c.key === "COMPANY_LOGO")?.value;
  const companyName = configs.find(c => c.key === "COMPANY_NAME")?.value || "DLA Access";
  const companyNit = configs.find(c => c.key === "COMPANY_NIT")?.value || "NIT o Documento";
  const companyAddress = configs.find(c => c.key === "COMPANY_ADDRESS")?.value || "Dirección";
  const companyCityConfig = configs.find(c => c.key === "COMPANY_CITY")?.value || "Ciudad";
  const companyDeptConfig = configs.find(c => c.key === "COMPANY_DEPARTMENT")?.value || "";
  const companyCity = companyDeptConfig ? `${companyCityConfig}, ${companyDeptConfig}` : companyCityConfig;
  const shiftLostTolerance = Number(configs.find(c => c.key === "SHIFT_LOST_TOLERANCE_MINUTES")?.value ?? 20);
  const shiftStartAlert = Number(configs.find(c => c.key === "SHIFT_START_ALERT_MINUTES")?.value ?? 15);
  const shiftEndAlert = Number(configs.find(c => c.key === "SHIFT_END_ALERT_MINUTES")?.value ?? 15);

  // Active Session & Visit Data
  const [activeSession, setActiveSession] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [punching, setPunching] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"agenda" | "visitas" | "nomina" | "perfil">("agenda");
  const [filterStatus, setFilterStatus] = useState<"all" | "today" | "pending" | "completed" | "lost" | "cancelled" | "in_progress">("all");

  // Payroll Summary & Profile State
  const [payrollData, setPayrollData] = useState<any | null>(null);
  const [employeeProfile, setEmployeeProfile] = useState<any | null>(null);

  // Live Clock & Chronometer
  const [currentTime, setCurrentTime] = useState<string>("");
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // WebCam Camera Stream & Photo Capture State
  const [cameraModalOpen, setCameraModalOpen] = useState<boolean>(false);
  const [isFaceScanOpen, setIsFaceScanOpen] = useState<boolean>(false);
  const [cameraPurpose, setCameraPurpose] = useState<"reference" | "start" | "end" | "novedad">("reference");
  const [targetShiftId, setTargetShiftId] = useState<string | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturedPhotoBase64, setCapturedPhotoBase64] = useState<string | null>(null);
  const [observations, setObservations] = useState<string>("");
  const [incidentType, setIncidentType] = useState<string>("cliente_ausente");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Personal Info Edit State
  const [editingPersonal, setEditingPersonal] = useState<boolean>(false);
    const sigCanvas = useRef<any>(null);
    const [signatureData, setSignatureData] = useState<string | null>(null);
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
      if (hash === "visitas" || hash === "nomina" || hash === "perfil") {
        setActiveTab(hash as any);
      } else {
        setActiveTab("agenda");
      }
    };
    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  // Request Notification Permission
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const notifiedShifts = useRef<Set<string>>(new Set());

  // Shift alerts logic based on configurations
  useEffect(() => {
    const checkAlerts = () => {
      if ("Notification" in window && Notification.permission === "granted") {
        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes();

        // Check assigned shifts for start alert
        if (visitList && Array.isArray(visitList)) {
          visitList.forEach((shift: any) => {
            if (shift.status === "scheduled" && shift.start_time) {
              const [sH, sM] = shift.start_time.split(":").map(Number);
              const shiftTime = sH * 60 + sM;
              const diff = shiftTime - currentTime;
              
              if (shiftStartAlert > 0 && diff > 0 && diff <= shiftStartAlert) {
                const alertId = `start-${shift.id}`;
                if (!notifiedShifts.current.has(alertId)) {
                  new Notification("¡Turno próximo a iniciar!", {
                    body: `Tu visita "${shift.name}" inicia en ${diff} minutos. ¡Prepárate!`,
                    icon: "/icons/icon-192x192.png",
                  });
                  notifiedShifts.current.add(alertId);
                }
              }
            }
          });
        }

        // Check active session for end alert
        if (activeSession?.active && activeSession.end_time) {
          const [eH, eM] = activeSession.end_time.split(":").map(Number);
          const endTime = eH * 60 + eM;
          const diff = endTime - currentTime;
          
          if (shiftEndAlert > 0 && diff > 0 && diff <= shiftEndAlert) {
            const alertId = `end-${activeSession.id}`;
            if (!notifiedShifts.current.has(alertId)) {
              new Notification("¡Turno por finalizar!", {
                body: `Tu turno actual finaliza en ${diff} minutos. No olvides marcar tu salida.`,
                icon: "/icons/icon-192x192.png",
              });
              notifiedShifts.current.add(alertId);
            }
          }
        }
      }
    };

    checkAlerts();
    const alertInterval = setInterval(checkAlerts, 60000); // check every minute
    return () => clearInterval(alertInterval);
  }, [visitList, activeSession, shiftStartAlert, shiftEndAlert]);

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
      const entryTimeStr = activeSession.session?.entry_time;
      const entryTimeMs = entryTimeStr ? new Date(entryTimeStr).getTime() : new Date().getTime();
      
      const updateTimer = () => {
        const now = new Date().getTime();
        const diff = Math.floor(Math.max(0, now - entryTimeMs) / 1000);
        setElapsedSeconds(isNaN(diff) ? 0 : diff);
      };
      
      updateTimer();
      timer = setInterval(updateTimer, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => clearInterval(timer);
  }, [activeSession]);

  const formatElapsed = (seconds: number) => {
    if (isNaN(seconds)) return "00:00:00";
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
    localStorage.removeItem("dla_face_registered");
    if (typeof window !== "undefined") {
      // Use href assignment to force full navigation – replace() can get stuck in PWA standalone mode
      window.location.href = "/login";
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

  const checkBiometricRegistered = useCallback((): boolean => {
    // If we have fresh data from the server, trust the server!
    if (employeeProfile) {
      const isRegistered = employeeProfile.is_face_registered || (employeeProfile.photo_url && String(employeeProfile.photo_url).trim() !== "");
      if (!isRegistered && typeof window !== "undefined") {
        // Clear local storage if the server says it's not registered
        localStorage.removeItem("dla_user_photo");
        localStorage.removeItem("dla_face_registered");
      }
      return !!isRegistered;
    }

    if ((user as any)?.is_face_registered || ((user as any)?.photo_url && String((user as any).photo_url).trim() !== "")) {
      return true;
    }
    if (typeof window !== "undefined") {
      const localPhoto = localStorage.getItem("dla_user_photo");
      const localRegistered = localStorage.getItem("dla_face_registered");
      if (localRegistered === "true" || (localPhoto && localPhoto.trim() !== "")) {
        return true;
      }
    }
    return false;
  }, [employeeProfile, user]);

  // Helper to calculate Haversine distance in meters
  const calculateDistanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371000;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  };

  // Mandatory Initial Reference Photo Gate Check - ONLY if NOT registered
  useEffect(() => {
    if (employeeProfile && !loading) {
      const registered = checkBiometricRegistered();
      if (!registered) {
        setCameraPurpose("reference");
        setIsFaceScanOpen(true);
      }
    }
  }, [employeeProfile, loading, checkBiometricRegistered]);

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
    const hasPhoto = checkBiometricRegistered();
    if (purpose === "reference" && hasPhoto) {
      setStatusMessage("🔒 Su foto de referencia biométrica ya está registrada y protegida. No requiere ser capturada nuevamente.");
      return;
    }
    setCameraPurpose(purpose);
    setTargetShiftId(shiftId || null);
    setCapturedPhotoBase64(null);
    setObservations("");
    
    if (purpose === "reference") {
      setIsFaceScanOpen(true);
    } else {
      setCameraModalOpen(true);
      setTimeout(() => {
        startCamera();
      }, 300);
    }
  };

  // Save Reference Photo Direct (from FaceScan)
  const handleSaveReferencePhotoDirect = async (photoBase64: string) => {
    setPunching(true);
    try {
      if (navigator.onLine) {
        const res = await api.post("/mobile/me/reference-photo", { photo_base64: photoBase64 });
        setStatusMessage("✅ Fotografía de referencia biométrica registrada y guardada exitosamente.");
        const photoUrl = res.data?.photo_url || photoBase64;
        setEmployeeProfile((prev: any) => ({ ...prev, photo_url: photoUrl, is_face_registered: true }));
        if (typeof window !== "undefined") {
          localStorage.setItem("dla_user_photo", photoUrl);
          localStorage.setItem("dla_face_registered", "true");
        }
      } else {
        const entry = { type: "reference", photoBase64, timestamp: new Date().toISOString() };
        // await registerAction(entry);
        setStatusMessage("✅ Fotografía de referencia guardada offline. Se sincronizará pronto.");
        if (typeof window !== "undefined") {
          localStorage.setItem("dla_user_photo", photoBase64);
          localStorage.setItem("dla_face_registered", "true");
        }
      }
    } catch (error: any) {
      console.error(error);
      setStatusMessage("❌ Error guardando la foto de referencia: " + (error.response?.data?.detail || error.message));
    } finally {
      setPunching(false);
    }
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
          localStorage.setItem("dla_face_registered", "true");
        }
        if (user) {
          (user as any).photo_url = photoUrl;
          (user as any).is_face_registered = true;
        }
        await fetchSession();
      } else {
        setStatusMessage("⚠️ Fotografía de referencia guardada localmente.");
        if (typeof window !== "undefined") {
          localStorage.setItem("dla_user_photo", capturedPhotoBase64);
          localStorage.setItem("dla_face_registered", "true");
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
      const currentTargetShift = visitList.find((v) => v.id === targetShiftId);

      // Validate GPS Geofence (if patient coordinates exist)
      if (currentTargetShift && currentTargetShift.latitude && currentTargetShift.longitude) {
        const dist = calculateDistanceMeters(
          location.lat,
          location.lng,
          Number(currentTargetShift.latitude),
          Number(currentTargetShift.longitude)
        );
        if (dist > 500) {
          setStatusMessage(`❌ Error de Ubicación: Te encuentras a ${dist}m del domicilio del paciente (Límite máximo: 500m). Debe estar en el sitio para iniciar la visita.`);
          stopCamera();
          setCameraModalOpen(false);
          setPunching(false);
          return;
        }
      }

      if (navigator.onLine) {
        await api.post("/mobile/me/start-visit", {
          shift_id: targetShiftId,
          latitude: location.lat,
          longitude: location.lng,
          photo_base64: capturedPhotoBase64 || undefined,
          offline_timestamp: timestamp,
        });
        setStatusMessage("🟢 ¡Marcación Biométrica y GPS Verificadas! Ingresando a Visita del Paciente...");
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
      setActiveTab("visitas");
      setFilterStatus("in_progress");
    } catch (err: any) {
      console.error("Error iniciando visita:", err);
      const msg = err?.response?.data?.detail || err?.message || "No se pudo iniciar visita";
      setStatusMessage(`❌ Error de Verificación: ${msg}`);
      stopCamera();
      setCameraModalOpen(false);
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
      setStatusMessage(res.data?.offline_cached ? res.data.message : "✅ Novedad de visita registrada correctamente.");
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
        signature_url: signatureData || employeeProfile?.signature_url,
      });
      setStatusMessage(res.data?.offline_cached ? res.data.message : "✅ Datos de contacto actualizados y auditados en el sistema.");
      setEditingPersonal(false);
      await fetchSession();
    } catch (err: any) {
      setStatusMessage(`Error: ${err?.response?.data?.detail || "Error actualizando perfil"}`);
    } finally {
      setSavingPersonal(false);
    }
  };

  // Payroll Printing & PDF Exporting & WhatsApp Share Handlers
  
  const handleExportPDF = async () => {
    if (!html2pdf) return;
    const element = document.getElementById("cuenta-de-cobro");
    if (!element) return;
    
    // Temporarily apply styling for PDF
    element.style.background = "#fff";
    element.style.color = "#000";
    element.style.padding = "20px";
    
    const opt = {
      margin:       10,
      filename:     `Cuenta_de_Cobro_${user?.full_name?.replace(/ /g, "_")}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    await html2pdf().from(element).set(opt).save();
    
    // Restore styling
    element.style.background = "";
    element.style.color = "";
    element.style.padding = "";
  };


  const handleShareWhatsApp = () => {
    if (!payrollData?.latest_record) return;
    const rec = payrollData.latest_record;
    const empName = user?.full_name || "Empleado";
    const text = `📄 *CUENTA DE COBRO - DLA ACCESS ENTERPRISE*\n👤 *Colaborador:* ${empName}\n💰 *Neto a Recibir:* $${Number(rec.net_pay || 0).toLocaleString("es-CO")}\n🗓️ *Período:* ${rec.period_id || "Actual"}\n✅ Firma digital verificada en plataforma.`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  // Evaluate 20-minute window tolerance for a shift
  const evaluateShiftTiming = (shift: any) => {
    if (shift.status === "completed") return { canStart: false, isLost: false, badge: "Completada" };
    if (shift.status === "salida_anticipada") return { canStart: false, isLost: false, isEarly: true, badge: "Salida Anticipada" };
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

    const earliestStart = new Date(scheduledStart.getTime() - shiftLostTolerance * 60 * 1000);
    const maxEndTolerance = new Date(scheduledEnd.getTime() + shiftLostTolerance * 60 * 1000);

    if (now < earliestStart) {
      return { canStart: true, isTooEarly: true, earliestTime: earliestStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), badge: "Horario Futuro" };
    }

    if (now > maxEndTolerance) {
      return { canStart: true, isLost: true, badge: "Turno Perdido" };
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
    if (filterStatus === "completed") return v.status === "completed" || v.status === "salida_anticipada";
    if (filterStatus === "lost") return v.status === "lost" || evaluateShiftTiming(v).isLost;
    if (filterStatus === "cancelled") return v.status === "cancelled";
    if (filterStatus === "in_progress") return v.status === "in_progress";
    return true;
  });

  const renderVisitCard = (v: any) => {
    const timing = evaluateShiftTiming(v);
    
    // Cálculo del valor generado si la visita fue completada/salida anticipada
    let valorGenerado = 0;
    if (v.worked_hours !== undefined && employeeProfile) {
      if (employeeProfile.salary_type === "hourly" && employeeProfile.hourly_rate) {
        valorGenerado = v.worked_hours * parseFloat(employeeProfile.hourly_rate);
      } else if (employeeProfile.shift_value) {
        valorGenerado = parseFloat(employeeProfile.shift_value);
      }
    }

    return (
      <Card key={v.id} className="bg-card/90 border-border">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="font-bold text-sm text-card-foreground">{v.client_name || v.name}</h4>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <MapPin className="h-3 w-3 text-primary" /> {v.client_address || v.address || "Dirección de Sede"}
              </p>
            </div>
            <Badge
              className={`text-[10px] uppercase font-black ${
                v.status === "in_progress" ? "bg-amber-500 text-amber-950 animate-pulse" :
                v.status === "completed" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" :
                v.status === "salida_anticipada" ? "bg-orange-500/20 text-orange-400 border-orange-500/30" :
                v.status === "lost" ? "bg-rose-500/20 text-rose-400 border-rose-500/30" :
                "bg-muted text-muted-foreground"
              }`}
            >
              {timing.badge}
            </Badge>
          </div>

          <div className="text-xs text-muted-foreground bg-background/60 p-2.5 rounded-xl flex items-center justify-between">
            <span>Fecha: <strong className="text-card-foreground">{v.shift_date || todayStr}</strong> ({v.start_time} - {v.end_time})</span>
            <span className="font-mono text-[11px] text-primary">{v.code || "VIS"}</span>
          </div>

          {v.observations && (
            <p className="text-[11px] text-muted-foreground italic bg-background/40 p-2 rounded-lg">"{v.observations}"</p>
          )}

          {/* Botón Principal de Acción de Ingreso / Salida al Paciente */}
          <div className="pt-1">
            {v.status === "in_progress" ? (
              <div className="space-y-3">
                <div className="p-3 bg-background/90 rounded-xl border border-emerald-500/30 text-center space-y-1">
                  <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">Tiempo de Visita</p>
                  <p className="text-2xl font-black font-mono text-emerald-400 tracking-wider">
                    {formatElapsed(elapsedSeconds)}
                  </p>
                </div>
                <Button
                  onClick={() => openCameraModal("end", v.id)}
                  className="w-full bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-card-foreground font-black text-xs gap-2 py-3 rounded-xl shadow-lg animate-pulse"
                >
                  <Square className="h-4 w-4 fill-white" /> ⏹️ Finalizar Visita / Registro Salida
                </Button>
              </div>
            ) : v.status === "completed" || v.status === "salida_anticipada" ? (
              <div className={`p-2 border rounded-xl text-center text-xs font-bold flex flex-col items-center justify-center gap-1.5 ${
                v.status === "completed" 
                  ? "bg-emerald-950/60 border-emerald-500/30 text-emerald-300"
                  : "bg-amber-950/60 border-amber-500/30 text-amber-300"
              }`}>
                <div className="flex items-center gap-1.5">
                  {v.status === "completed" ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                  <span>{v.status === "completed" ? "Visita Finalizada Exitosamente" : "Visita Finalizada (Salida Anticipada)"}</span>
                </div>
                {v.worked_hours !== undefined && (
                  <span className="text-[11px] opacity-90 font-mono flex items-center gap-2 mt-1">
                    <span>⏱️ Tiempo: {v.worked_hours} hrs</span>
                    {valorGenerado > 0 && <span>| 💰 Valor: ${valorGenerado.toLocaleString('es-CO')}</span>}
                  </span>
                )}
              </div>
            ) : v.status === "cancelled" || v.status === "lost" || timing.isLost ? (
              <div className="p-2 bg-rose-950/60 border border-rose-500/30 rounded-xl text-center text-xs font-bold text-rose-300 flex items-center justify-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-rose-400" />
                <span>Visita {(v.status === "lost" || timing.isLost) ? "Perdida" : "Cancelada"}</span>
              </div>
            ) : (
              <Button
                onClick={() => openCameraModal("start", v.id)}
                disabled={!timing.canStart || punching}
                className={`w-full font-black text-xs gap-2 py-3 rounded-xl shadow-lg ${
                  timing.canStart
                    ? "bg-gradient-to-r from-primary to-secondary hover:from-blue-500 hover:to-cyan-500 text-card-foreground"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                }`}
              >
                <Play className="h-4 w-4 fill-white" /> ▶️ Ingresar a Visita de {v.patient_name || v.client_name || "Paciente"}
              </Button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs pt-1">
            {v.client_address ? (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(v.client_address)}`}
                target="_blank"
                rel="noreferrer"
                className="p-2.5 bg-muted hover:bg-muted text-primary rounded-xl font-bold flex items-center justify-center gap-1 text-center"
              >
                <Navigation className="h-3.5 w-3.5" /> Abrir Mapa
              </a>
            ) : (
              <button
                onClick={() => alert("Ubicación de cliente sin coordenadas GPS exactas.")}
                className="p-2.5 bg-muted/50 text-muted-foreground rounded-xl font-bold flex items-center justify-center gap-1 text-center"
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
              className="p-2.5 bg-amber-600/80 hover:bg-amber-600 text-card-foreground rounded-xl font-bold flex items-center justify-center gap-1 text-center"
            >
              <AlertTriangle className="h-3.5 w-3.5" /> Novedad / Incidencia
            </button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto pb-24 px-2 sm:px-4 text-foreground select-none">
      {/* Top Mobile Bar with Clean Logout */}
      <div className="flex items-center justify-between p-3 bg-card/90 border border-border rounded-2xl backdrop-blur-md shadow-lg">
        <div className="flex items-center gap-2.5">
          {companyLogo ? (
            <div className="h-10 w-10 bg-card rounded-xl flex items-center justify-center shadow-inner overflow-hidden p-0.5">
              <img src={companyLogo} alt="Logo" className="w-full h-full object-contain" />
            </div>
          ) : (
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center font-bold text-card-foreground shadow">
              <ShieldCheck className="h-6 w-6" />
            </div>
          )}
          <div>
            <p className="text-xs font-black text-card-foreground">{user?.full_name || "Operador de Campo"}</p>
            <p className="text-[10px] text-primary font-mono">PWA CAMPO | {currentTime}</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-8 w-8 text-muted-foreground hover:text-foreground">
            {theme === "light" ? <Sun className="h-4 w-4 text-amber-500" /> : theme === "dark" ? <Moon className="h-4 w-4 text-cyan-400" /> : <Monitor className="h-4 w-4 text-muted-foreground" />}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCleanLogout}
            className="text-rose-400 hover:text-rose-500 hover:bg-rose-500/10 gap-1 text-xs font-bold px-2"
          >
            <LogOut className="h-4 w-4" /> Salir
          </Button>
        </div>
      </div>

      {/* BANNER REGISTRO OBLIGATORIO DE FOTO INICIAL */}
      {(() => {
        const hasPhoto = checkBiometricRegistered();
        if (hasPhoto) return null;

        return (
          <div className="p-4 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-2 border-amber-500/60 rounded-2xl text-amber-200 space-y-2 shadow-xl animate-pulse">
            <div className="flex items-center gap-2 font-bold text-xs text-amber-300">
              <Camera className="h-5 w-5 text-amber-400 shrink-0" />
              <span>Registro Biométrico Inicial Obligatorio</span>
            </div>
            <p className="text-[11px] leading-snug text-muted-foreground">
              No se detectó una foto facial registrada para su perfil. Debe tomar su fotografía por primera vez para poder activar el inicio de visitas y marcaciones.
            </p>
            <Button
              size="sm"
              onClick={() => openCameraModal("reference")}
              className="w-full bg-amber-500 hover:bg-amber-600 text-background font-black text-xs gap-1.5 py-3 shadow"
            >
              <Camera className="h-4 w-4" /> Tomar y Registrar Mi Foto Ahora
            </Button>
          </div>
        );
      })()}

      {/* Face ID Scanning Overlay for Reference Photo */}
      {isFaceScanOpen && (
        <FaceScanOverlay 
          onCapture={(base64Img) => {
            setCapturedPhotoBase64(base64Img);
            setIsFaceScanOpen(false);
            // Auto-save the reference photo once captured successfully
            setTimeout(() => {
              // Simulating the save click by directly calling the function since the image is captured
              handleSaveReferencePhotoDirect(base64Img);
            }, 100);
          }}
          onCancel={() => setIsFaceScanOpen(false)}
        />
      )}

      {/* Navigation Pill Tabs */}
      <div className="grid grid-cols-4 gap-1 p-1 bg-background/90 rounded-2xl border border-border text-[10px]">
        <button
          type="button"
          onClick={() => { setActiveTab("agenda"); window.location.hash = "agenda"; }}
          className={`py-2 px-1 rounded-xl font-bold transition-all flex flex-col items-center justify-center gap-0.5 ${
            activeTab === "agenda" ? "bg-gradient-to-r from-primary to-secondary text-primary-foreground shadow-lg" : "text-muted-foreground hover:text-card-foreground"
          }`}
        >
          <Clock className="h-3.5 w-3.5" />
          <span>Dashboard</span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab("visitas"); window.location.hash = "visitas"; }}
          className={`py-2 px-1 rounded-xl font-bold transition-all flex flex-col items-center justify-center gap-0.5 ${
            activeTab === "visitas" ? "bg-gradient-to-r from-primary to-secondary text-primary-foreground shadow-lg" : "text-muted-foreground hover:text-card-foreground"
          }`}
        >
          <Calendar className="h-3.5 w-3.5" />
          <span>Visitas</span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab("nomina"); window.location.hash = "nomina"; }}
          className={`py-2 px-1 rounded-xl font-bold transition-all flex flex-col items-center justify-center gap-0.5 ${
            activeTab === "nomina" ? "bg-gradient-to-r from-primary to-secondary text-primary-foreground shadow-lg" : "text-muted-foreground hover:text-card-foreground"
          }`}
        >
          <DollarSign className="h-3.5 w-3.5" />
          <span>Nómina</span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab("perfil"); window.location.hash = "perfil"; }}
          className={`py-2 px-1 rounded-xl font-bold transition-all flex flex-col items-center justify-center gap-0.5 ${
            activeTab === "perfil" ? "bg-gradient-to-r from-primary to-secondary text-primary-foreground shadow-lg" : "text-muted-foreground hover:text-card-foreground"
          }`}
        >
          <User className="h-3.5 w-3.5" />
          <span>Perfil</span>
        </button>
      </div>

      {/* Global Status Message Toast Banner */}
      {statusMessage && (
        <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
          statusMessage.includes("Error") || statusMessage.includes("PERDIDO") ? "bg-rose-500/10 border border-rose-500/30 text-rose-300" : "bg-emerald-500/20 border border-emerald-500/30 text-emerald-300"
        }`}>
          {statusMessage.includes("Error") || statusMessage.includes("PERDIDO") ? <AlertCircle className="h-4 w-4 shrink-0" /> : <CheckCircle2 className="h-4 w-4 shrink-0" />}
          <span>{statusMessage}</span>
        </div>
      )}

      {/* ────────────────── TAB 1: DASHBOARD PRINCIPAL OPERATIVO ────────────────── */}
      {activeTab === "agenda" && (
        <div className="space-y-4">
          {/* USER WELCOME & METRICS CARD */}
          <Card className="bg-card border-border text-foreground shadow-xl">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <h2 className="text-base font-black text-card-foreground">{companyName}</h2>
                  <p className="text-xs text-primary font-mono">{employeeProfile?.job_position || "Operador de Campo"}</p>
                </div>
                <Badge className="bg-emerald-600 text-card-foreground text-[10px] font-bold">
                  {employeeProfile?.status === "active" ? "Activo en Servicio" : "Activo"}
                </Badge>
              </div>

              {/* Indicadores Operativos */}
              <div className="grid grid-cols-4 gap-2 text-center pt-1">
                <div className="p-2.5 bg-background rounded-xl border border-border">
                  <p className="text-lg font-black text-primary">98%</p>
                  <p className="text-[9px] text-muted-foreground font-bold uppercase">Cumplimiento</p>
                </div>
                <div className="p-2.5 bg-background rounded-xl border border-border">
                  <p className="text-lg font-black text-emerald-400">{totalCompleted}</p>
                  <p className="text-[9px] text-muted-foreground font-bold uppercase">Completadas</p>
                </div>
                <div className="p-2.5 bg-background rounded-xl border border-border">
                  <p className="text-lg font-black text-amber-400">{totalPending}</p>
                  <p className="text-[9px] text-muted-foreground font-bold uppercase">Pendientes</p>
                </div>
                <div className="p-2.5 bg-background rounded-xl border border-border">
                  <p className="text-lg font-black text-rose-400">{totalLost}</p>
                  <p className="text-[9px] text-muted-foreground font-bold uppercase">Perdidas</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* VISITA EN CURSO O PRÓXIMA VISITA DESTACADA */}
          {activeSession?.active && activeSession?.shift ? (
            <Card className="bg-card border-2 border-emerald-500 text-card-foreground shadow-2xl overflow-hidden relative">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-emerald-500 animate-pulse" />
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <Badge className="bg-emerald-500 text-background font-black text-xs gap-1">
                    <span className="h-2 w-2 rounded-full bg-background animate-ping" /> VISITA EN CURSO
                  </Badge>
                  <span className="text-xs text-muted-foreground font-mono">Código: {activeSession.shift.id}</span>
                </div>

                <div className="space-y-1">
                  <h2 className="text-lg font-black text-card-foreground">{activeSession.shift.name}</h2>
                  <p className="text-xs text-primary font-semibold flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> {activeSession.shift.client_name || "Sede Asignada"}
                  </p>
                </div>

                {/* LIVE CHRONOMETER */}
                <div className="p-4 bg-background/90 rounded-2xl border border-emerald-500/50 text-center space-y-1">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Tiempo Registrado en Sitio</p>
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
            (() => {
              const todaysVisits = visitList.filter(v => v.shift_date === todayStr);
              if (todaysVisits.length === 0) {
                return (
                  <Card className="bg-card border-border text-foreground text-center py-6">
                    <CardContent className="space-y-2">
                      <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto" />
                      <h3 className="font-bold text-sm">¡Sin Visitas Programadas para Hoy!</h3>
                      <p className="text-xs text-muted-foreground">Disfruta tu día, no tienes asignaciones para hoy.</p>
                    </CardContent>
                  </Card>
                );
              }
              return (
                <div className="space-y-4">
                  <h3 className="font-bold text-sm flex items-center gap-2 px-1">
                    <Calendar className="h-4 w-4 text-primary" /> Agenda del Día
                  </h3>
                  {todaysVisits.map(renderVisitCard)}
                </div>
              );
            })()
          )}

          {/* ACCIONES RÁPIDAS OPERATIVAS */}
          <div className="mt-3">
            <Button
              onClick={() => { setActiveTab("visitas"); window.location.hash = "visitas"; }}
              className="w-full py-5 bg-gradient-to-r from-cyan-600 to-teal-600 text-card-foreground font-bold text-xs gap-2 rounded-2xl shadow"
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
            <h3 className="text-sm font-bold text-card-foreground flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-primary" /> Registro de Visitas Asignadas
            </h3>
          </div>

          {/* Filters with Counts */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 text-[10px]">
            {[
              { id: "all", label: "Todas", count: visitList.length },
              { id: "today", label: "Hoy", count: visitList.filter(v => v.shift_date === todayStr).length },
              { id: "in_progress", label: "En Curso", count: visitList.filter(v => v.status === "in_progress").length },
              { id: "pending", label: "Pendientes", count: visitList.filter(v => v.status === "scheduled" || v.status === "pending" || v.status === "in_progress").length },
              { id: "completed", label: "Completadas", count: visitList.filter(v => v.status === "completed").length },
              { id: "lost", label: "Perdidas", count: visitList.filter(v => v.status === "lost" || evaluateShiftTiming(v).isLost).length },
              { id: "cancelled", label: "Canceladas", count: visitList.filter(v => v.status === "cancelled").length },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setFilterStatus(st.id as any)}
                className={`px-3 py-1.5 rounded-xl font-bold capitalize transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  filterStatus === st.id ? "bg-cyan-600 text-card-foreground shadow" : "bg-card text-muted-foreground hover:text-card-foreground border border-border"
                }`}
              >
                <span>{st.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono ${
                  filterStatus === st.id ? "bg-card/20 text-card-foreground" : "bg-muted text-muted-foreground"
                }`}>
                  {st.count}
                </span>
              </button>
            ))}
          </div>

          {filteredVisitasList.length === 0 ? (
            <Card className="bg-card border-border text-foreground text-center py-8">
              <CardContent className="space-y-2">
                <Calendar className="h-10 w-10 text-primary mx-auto opacity-80" />
                <h3 className="font-bold text-sm text-card-foreground">Sin Visitas Registradas</h3>
                <p className="text-xs text-muted-foreground">No se encontraron turnos asignados por tu supervisor para este filtro.</p>
              </CardContent>
            </Card>
          ) : (
            filteredVisitasList.map(renderVisitCard)
          )}
        </div>
      )}

      {/* ────────────────── TAB 4: MÓDULO NÓMINA (PDF & WHATSAPP) ────────────────── */}
      {activeTab === "nomina" && (
        <div className="space-y-4">
          <Card className="bg-card border-border text-foreground shadow-xl">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2 text-emerald-400">
                <DollarSign className="h-5 w-5" /> Generar Cuenta de Cobro
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Resumen de haberes y deducciones calculadas para el período actual de nómina.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {payrollData?.latest_record ? (
                <div id="cuenta-summary-ui" className="space-y-3 text-xs p-2">
                  <div style={{ position: "absolute", left: "-9999px", top: "-9999px" }}>
                    <div id="cuenta-de-cobro">
                      <CuentaDeCobroTemplate
                        employee={{ 
                          ...employeeProfile, 
                          payment_method: payrollData.latest_record.payment_method,
                          bank_name: payrollData.latest_record.bank_name,
                          bank_account_number: payrollData.latest_record.bank_account_number,
                          signature_url: payrollData.latest_record.signature_url
                        }}
                        company={{ 
                          name: companyName, 
                          tax_id: companyNit, 
                          address: companyAddress, 
                          city: companyCity 
                        }}
                        period={{ id: payrollData.latest_record.period_id, start_date: "Inicio Periodo", end_date: "Fin Periodo" }}
                        amount={Number(payrollData.latest_record.net_pay || 0)}
                      />
                    </div>
                  </div>
                  <div className="p-4 bg-background rounded-2xl border border-emerald-500/50 text-center space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Neto a Recibir en Cuenta</p>
                    <p className="text-3xl font-black font-mono text-emerald-400">
                      ${Number(payrollData.latest_record.net_pay || 0).toLocaleString("es-CO")}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 bg-background/60 rounded-xl">
                      <p className="text-[10px] text-muted-foreground">Salario Base:</p>
                      <p className="font-bold font-mono text-card-foreground">${Number(payrollData.latest_record.base_salary || 0).toLocaleString("es-CO")}</p>
                    </div>
                    <div className="p-3 bg-background/60 rounded-xl">
                      <p className="text-[10px] text-muted-foreground">Aux. Transporte:</p>
                      <p className="font-bold font-mono text-card-foreground">${Number(payrollData.latest_record.transportation_assistance || 0).toLocaleString("es-CO")}</p>
                    </div>
                    <div className="p-3 bg-background/60 rounded-xl">
                      <p className="text-[10px] text-muted-foreground">Horas Extras / Recargos:</p>
                      <p className="font-bold font-mono text-emerald-400">${Number(payrollData.latest_record.overtime_value || 0).toLocaleString("es-CO")}</p>
                    </div>
                    <div className="p-3 bg-background/60 rounded-xl">
                      <p className="text-[10px] text-muted-foreground">Deducciones Salud/Pensión:</p>
                      <p className="font-bold font-mono text-rose-400">-${Number((payrollData.latest_record.health_deduction || 0) + (payrollData.latest_record.pension_deduction || 0)).toLocaleString("es-CO")}</p>
                    </div>
                  </div>

                  {/* DETALLE DE TURNOS (TODO LO QUE SE HA HECHO EN EL PERIODO) */}
                  {payrollData.latest_record.shifts && payrollData.latest_record.shifts.length > 0 && (
                    <div className="p-3 bg-background/60 rounded-xl border border-border">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold mb-2">Detalle de Turnos Laborados</p>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                        {payrollData.latest_record.shifts.map((s: any) => (
                          <div key={s.id} className="flex justify-between items-center text-[10px] border-b border-border pb-1">
                            <div>
                              <p className="font-bold text-card-foreground">{s.date}</p>
                              <p className="text-muted-foreground truncate w-32">{s.name}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-primary font-mono text-[10px]">{s.start_time} - {s.end_time}</p>
                              <p className={`font-bold ${s.status === 'salida_anticipada' ? 'text-orange-400' : 'text-muted-foreground'} text-[9px] uppercase`}>
                                {s.status.replace("_", " ")}
                              </p>
                              {s.worked_hours !== undefined && (
                                <p className="text-emerald-400 font-bold mt-0.5 text-[11px]">${Number(s.earned_value || 0).toLocaleString("es-CO")} <span className="text-muted-foreground font-normal">({s.worked_hours}h)</span></p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* FIRMA DIGITAL DEL CONTRATO INCORPORADA */}
                  {employeeProfile?.signature_url && (
                    <div className="p-3 bg-background border border-border rounded-xl text-center space-y-1">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">Firma Digital del Contrato Incorporada</p>
                      <img src={employeeProfile.signature_url} alt="Firma Oficial" className="h-12 mx-auto object-contain bg-card/90 p-1 rounded" />
                    </div>
                  )}

                  {/* BOTONES DE IMPRESIÓN, PDF Y WHATSAPP */}
                  <div className="grid grid-cols-3 gap-2 pt-2">
                    <Button onClick={handleExportPDF} variant="outline" className="text-xs font-bold gap-1 text-foreground border-border">
                      <Printer className="h-3.5 w-3.5 text-primary" /> Imprimir
                    </Button>
                    <Button onClick={handleExportPDF} variant="outline" className="text-xs font-bold gap-1 text-foreground border-border">
                      <Download className="h-3.5 w-3.5 text-emerald-400" /> Exportar PDF
                    </Button>
                    <Button onClick={handleShareWhatsApp} className="text-xs font-bold gap-1 bg-emerald-600 hover:bg-emerald-700 text-card-foreground">
                      <Share2 className="h-3.5 w-3.5" /> WhatsApp
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-6 bg-background rounded-2xl text-center text-xs text-muted-foreground space-y-1">
                  <FileText className="h-8 w-8 text-primary mx-auto" />
                  <p className="font-bold text-card-foreground">Nómina del Período Actual</p>
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
              <Card className="bg-card border-border text-foreground shadow-xl">
                <CardHeader className="text-center pb-2">
                  <div className="mx-auto relative">
                    {hasPhoto ? (
                      <img src={currentPhoto} alt="Foto Oficial" className="h-28 w-28 rounded-full object-cover border-4 border-emerald-500 shadow-xl mx-auto" />
                    ) : (
                      <div className="h-28 w-28 rounded-full bg-muted border-4 border-amber-500 flex items-center justify-center text-amber-400 mx-auto">
                        <User className="h-14 w-14" />
                      </div>
                    )}
                  </div>

                  <CardTitle className="text-lg font-black text-card-foreground pt-2">{user?.full_name}</CardTitle>
                  <CardDescription className="text-xs text-primary font-mono">
                    {employeeProfile?.job_position || "Operador de Campo"} | {user?.email}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4 text-xs">
                  {/* DATOS ADMINISTRATIVOS ESTRICTAMENTE BLOQUEADOS */}
                  <div className="p-3 bg-background rounded-2xl border border-border space-y-2">
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Datos Administrativos (Solo Lectura - ERP)</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div><span className="text-muted-foreground">Documento Cédula:</span> <p className="font-bold font-mono text-card-foreground">{employeeProfile?.document_number || "—"}</p></div>
                      <div><span className="text-muted-foreground">Código Empleado:</span> <p className="font-bold font-mono text-card-foreground">{employeeProfile?.code || "—"}</p></div>
                      <div><span className="text-muted-foreground">EPS (Salud):</span> <p className="font-bold text-card-foreground">{employeeProfile?.eps || "EPS Sura"}</p></div>
                      <div><span className="text-muted-foreground">ARL (Riesgos):</span> <p className="font-bold text-card-foreground">{employeeProfile?.arl || "Positiva ARL"}</p></div>
                      <div><span className="text-muted-foreground">Fondo Pensiones:</span> <p className="font-bold text-card-foreground">{employeeProfile?.afp || "Porvenir S.A."}</p></div>
                      <div><span className="text-muted-foreground">Caja Compensación:</span> <p className="font-bold text-card-foreground">{employeeProfile?.caja_compensacion || "Comfama"}</p></div>
                    </div>
                  </div>

                  {/* FORMULARIO EDITABLE DE CONTACTO CON AUDITORÍA */}
                  <div className="p-3 bg-background rounded-2xl border border-cyan-500/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-primary font-bold uppercase tracking-wider">Datos de Contacto Personales Editables</p>
                      {!editingPersonal ? (
                        <button onClick={() => setEditingPersonal(true)} className="text-primary font-bold text-xs flex items-center gap-1 hover:underline">
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
                          <label className="text-[10px] text-muted-foreground font-bold">Celular / Teléfono Móvil</label>
                          <Input
                            value={personalForm.mobile}
                            onChange={(e) => setPersonalForm({ ...personalForm, mobile: e.target.value })}
                            className="bg-card border-border text-card-foreground text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-muted-foreground font-bold">Dirección Residencial</label>
                          <Input
                            value={personalForm.address}
                            onChange={(e) => setPersonalForm({ ...personalForm, address: e.target.value })}
                            className="bg-card border-border text-card-foreground text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-muted-foreground font-bold">Ciudad</label>
                          <Input
                            value={personalForm.city}
                            onChange={(e) => setPersonalForm({ ...personalForm, city: e.target.value })}
                            className="bg-card border-border text-card-foreground text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-muted-foreground font-bold">Contacto de Emergencia (Nombre)</label>
                          <Input
                            value={personalForm.emergency_contact_name}
                            onChange={(e) => setPersonalForm({ ...personalForm, emergency_contact_name: e.target.value })}
                            className="bg-card border-border text-card-foreground text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-muted-foreground font-bold">Teléfono de Emergencia</label>
                          <Input
                            value={personalForm.emergency_contact_phone}
                            onChange={(e) => setPersonalForm({ ...personalForm, emergency_contact_phone: e.target.value })}
                            className="bg-card border-border text-card-foreground text-xs"
                          />
                        </div>

                        <Button onClick={handleSavePersonalInfo} disabled={savingPersonal} className="w-full bg-cyan-600 hover:bg-cyan-700 text-card-foreground font-bold text-xs gap-1.5 py-4">
                          <Save className="h-4 w-4" /> Guardar Cambios (con Auditoría GPS)
                        </Button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div><span className="text-muted-foreground">Celular Móvil:</span> <p className="font-bold text-card-foreground">{employeeProfile?.mobile || personalForm.mobile || "—"}</p></div>
                        <div><span className="text-muted-foreground">Ciudad:</span> <p className="font-bold text-card-foreground">{employeeProfile?.city || personalForm.city || "—"}</p></div>
                        <div className="col-span-2"><span className="text-muted-foreground">Dirección Residencial:</span> <p className="font-bold text-card-foreground">{employeeProfile?.address || personalForm.address || "—"}</p></div>
                        <div className="col-span-2"><span className="text-muted-foreground">Contacto Emergencia:</span> <p className="font-bold text-card-foreground">{employeeProfile?.emergency_contact_name || "—"} ({employeeProfile?.emergency_contact_phone || "—"})</p></div>
                      </div>
                    )}
                  </div>

                  {/* BLOQUEO DE FOTO BIOMÉTRICA */}
                  {hasPhoto ? (
                    <div className="p-4 bg-background/80 border border-emerald-500/50 rounded-2xl text-center space-y-1.5">
                      <div className="flex items-center justify-center gap-1.5 text-emerald-400 font-bold text-xs">
                        <ShieldCheck className="h-4 w-4" />
                        <span>Foto Biométrica Registrada & Protegida</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground leading-relaxed">
                        Su foto de referencia está activa y guardada. Por seguridad del sistema, no se permite modificar la foto desde la App Móvil. Para cualquier actualización, solicítelo a su supervisor en el ERP Web.
                      </p>
                    </div>
                  ) : (
                    <Button
                      onClick={() => openCameraModal("reference")}
                      className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-card-foreground font-black text-xs gap-2 py-4 shadow-lg animate-pulse"
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
        <DialogContent className="max-w-md bg-card text-card-foreground border-border">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-amber-400">
              <AlertTriangle className="h-5 w-5" /> Registrar Novedad de Visita
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="text-[10px] text-muted-foreground font-bold">Tipo de Novedad / Incidencia</label>
              <select
                value={incidentType}
                onChange={(e) => setIncidentType(e.target.value)}
                className="w-full p-2.5 bg-background border border-border rounded-xl text-card-foreground text-xs font-bold mt-1"
              >
                <option value="cliente_ausente">Cliente / Sede Ausente</option>
                <option value="acceso_denegado">Acceso Denegado en Portería</option>
                <option value="reprogramado">Visita Reprogramada por Cliente</option>
                <option value="falla_tecnica">Falla Técnica / Inconveniente</option>
                <option value="otro">Otro Motivo u Observación</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground font-bold">Detalle de la Observación</label>
              <textarea
                rows={3}
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                placeholder="Describa brevemente lo sucedido..."
                className="w-full p-2.5 bg-background border border-border rounded-xl text-card-foreground text-xs mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveNovedad} disabled={savingNovedad} className="w-full bg-amber-600 hover:bg-amber-700 text-card-foreground font-bold text-xs gap-1 py-3">
              <Send className="h-4 w-4" /> Guardar Novedad
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* WEBCAM CAMERA MODAL WITH CANVAS CAPTURE & FALLBACK */}
      <Dialog open={cameraModalOpen} onOpenChange={(open) => { if (!open) stopCamera(); setCameraModalOpen(open); }}>
        <DialogContent className="max-w-md bg-card text-card-foreground border-border">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-primary">
              <Camera className="h-5 w-5" />
              {cameraPurpose === "reference" ? "Capturar Foto de Referencia Oficial" : cameraPurpose === "start" ? "Ingreso a Visita de Paciente" : "Finalización de Visita de Paciente"}
            </DialogTitle>
          </DialogHeader>

          {/* TARGET PATIENT & GEOREFERENCE CORROBORATION INFO */}
          {(() => {
            const currentTargetShift = visitList.find((v) => v.id === targetShiftId);
            if (!currentTargetShift || (cameraPurpose !== "start" && cameraPurpose !== "end")) return null;

            return (
              <div className="p-3 bg-background rounded-xl border border-cyan-500/30 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-primary">Paciente Acompañado:</span>
                  <span className="font-mono text-[10px] text-muted-foreground">{currentTargetShift.code || "VIS"}</span>
                </div>
                <p className="font-black text-card-foreground text-sm">{currentTargetShift.patient_name || currentTargetShift.client_name || currentTargetShift.name}</p>
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>{currentTargetShift.client_address || currentTargetShift.address || "Dirección de Paciente"}</span>
                </p>

                {/* Geofence GPS Corroboration Badge */}
                {(() => {
                  if (!coords) {
                    return (
                      <div className="p-2 bg-card rounded-lg text-[10px] text-amber-300 flex items-center gap-1.5 font-bold">
                        <RefreshCw className="h-3 w-3 animate-spin text-amber-400" />
                        <span>Obteniendo coordenadas GPS en tiempo real...</span>
                      </div>
                    );
                  }
                  if (currentTargetShift.latitude && currentTargetShift.longitude) {
                    const dist = calculateDistanceMeters(coords.lat, coords.lng, Number(currentTargetShift.latitude), Number(currentTargetShift.longitude));
                    const isNear = dist <= 300;
                    return (
                      <div className={`p-2 rounded-lg text-[10px] font-bold flex items-center gap-1.5 ${
                        isNear ? "bg-emerald-950/80 border border-emerald-500/50 text-emerald-300" : "bg-amber-950/80 border border-amber-500/40 text-amber-300"
                      }`}>
                        <MapPin className={`h-3.5 w-3.5 ${isNear ? "text-emerald-400" : "text-amber-400"}`} />
                        <span>
                          {isNear
                            ? `🟢 Georreferencia Confirmada: A ${dist} metros del paciente`
                            : `🟡 Ubicación a ${dist}m del domicilio del paciente (Auditado)`}
                        </span>
                      </div>
                    );
                  }
                  return (
                    <div className="p-2 bg-card rounded-lg text-[10px] text-primary font-mono flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-primary" />
                      <span>GPS Capturado: Lat {coords.lat.toFixed(4)}, Lng {coords.lng.toFixed(4)}</span>
                    </div>
                  );
                })()}
              </div>
            );
          })()}

          <div className="space-y-4 py-2 text-xs">
            {/* Live WebCam Stream / Canvas Display */}
            <div className="relative aspect-video bg-background rounded-2xl overflow-hidden border border-border flex items-center justify-center">
              {!capturedPhotoBase64 ? (
                <>
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                  <div className="absolute inset-0 border-2 border-dashed border-cyan-500/50 rounded-2xl pointer-events-none flex items-center justify-center">
                    <p className="text-[10px] text-primary font-mono bg-background/80 px-2 py-1 rounded">Alinee su rostro al centro</p>
                  </div>
                </>
              ) : (
                <img src={capturedPhotoBase64} alt="Foto Capturada" className="w-full h-full object-cover" />
              )}
              <canvas ref={canvasRef} className="hidden" />
            </div>

            {/* Fallback File Capture */}
            <div className="flex items-center justify-between text-[11px] border-t border-border pt-2">
              <span className="text-muted-foreground">¿Problemas con la cámara?</span>
              <label className="text-primary hover:underline cursor-pointer font-bold flex items-center gap-1">
                <Upload className="h-3.5 w-3.5" /> Subir Fotografía
                <input type="file" accept="image/*" capture="user" onChange={handleFileCapture} className="hidden" />
              </label>
            </div>
          </div>

          <DialogFooter className="flex flex-col gap-2 sm:flex-row">
            {!capturedPhotoBase64 ? (
              <Button onClick={takeCanvasSnapshot} className="w-full bg-cyan-600 hover:bg-cyan-700 font-bold text-xs gap-1 py-3">
                <Camera className="h-4 w-4" /> Tomar Captura Facial
              </Button>
            ) : (
              <>
                <Button onClick={() => { setCapturedPhotoBase64(null); startCamera(); }} variant="outline" className="w-full sm:w-1/2 text-xs text-foreground border-border">
                  Repetir Foto
                </Button>
                <Button
                  onClick={
                    cameraPurpose === "reference" ? handleSaveReferencePhoto :
                    cameraPurpose === "start" ? handleConfirmStartVisit : handleConfirmEndVisit
                  }
                  disabled={punching}
                  className="w-full sm:w-1/2 bg-emerald-600 hover:bg-emerald-700 text-card-foreground font-bold text-xs gap-1 py-3"
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
