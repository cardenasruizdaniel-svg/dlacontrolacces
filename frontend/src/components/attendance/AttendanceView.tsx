"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import api from "@/lib/api";
import { usePWA } from "@/hooks/usePWA";
import { saveOfflinePunch } from "@/lib/offlineStore";
import { useSystemConfig } from "@/lib/useSystemConfig";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Clock, MapPin, Camera, CheckCircle2, AlertCircle, RefreshCw,
  Coffee, Utensils, LogIn, LogOut, ShieldCheck, Loader2, Building2, User, KeyRound, ArrowRight, XCircle, Upload
} from "lucide-react";

export default function AttendanceView() {
  const { isOnline, pendingCount, isSyncing, triggerSync } = usePWA();
  const { configs } = useSystemConfig();

  const companyLogo = configs.find((c) => c.key === "COMPANY_LOGO")?.value;
  const companyNameConfig = configs.find((c) => c.key === "COMPANY_NAME")?.value || "DLA Redes y Seguridad";

  // Kiosk Search State
  const [employeeCodeInput, setEmployeeCodeInput] = useState<string>("");
  const [searchingEmp, setSearchingEmp] = useState<boolean>(false);
  const [employeeStatus, setEmployeeStatus] = useState<any | null>(null);

  // Event Punch States
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [pendingEventType, setPendingEventType] = useState<string | null>(null);
  const [capturedPhotoBase64, setCapturedPhotoBase64] = useState<string | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [breakName, setBreakName] = useState<string>("Pausa Activa");
  const [observations, setObservations] = useState<string>("");
  const [punching, setPunching] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Status & Error Messages
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");

  // Live Clock
  const [currentTime, setCurrentTime] = useState<string>("");
  const [currentDate, setCurrentDate] = useState<string>("");

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString("es-CO", { hour12: true }));
      setCurrentDate(
        now.toLocaleDateString("es-CO", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // GPS Location
  const getGPS = (): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve({ lat: 4.6097, lng: -74.0817 });
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
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
      console.warn("No se pudo iniciar cámara directa en Kiosk, use selector de archivo:", err);
    }
  };

  // Stop Camera Stream
  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
    }
  };

  // Take Snapshot from Canvas
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

  // Handle File Upload Fallback
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

  // Lookup Employee by Code / Cédula
  const handleLookupEmployee = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanCode = employeeCodeInput.trim();
    if (!cleanCode) return;

    setSearchingEmp(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      if (navigator.onLine) {
        const res = await api.get(`/attendance/kiosk/employee/${encodeURIComponent(cleanCode)}`);
        setEmployeeStatus(res.data);
      } else {
        setEmployeeStatus({
          employee_id: `emp-${cleanCode}`,
          employee_name: `Empleado ${cleanCode}`,
          job_position: "Personal de Sede",
          company_name: companyNameConfig,
          date_str: new Date().toISOString().split("T")[0],
          current_state: "off_shift",
          allowed_events: ["shift_start"],
          next_expected_event: "shift_start",
        });
      }
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.detail || `No se encontró el empleado con código o cédula '${cleanCode}'`);
      setEmployeeStatus(null);
    } finally {
      setSearchingEmp(false);
    }
  };

  // Reset Kiosk for Next Employee
  const handleResetKiosk = () => {
    stopCamera();
    setEmployeeCodeInput("");
    setEmployeeStatus(null);
    setErrorMessage("");
    setSuccessMessage("");
    setModalOpen(false);
  };

  // Open Camera Modal for Punch
  const handleOpenPunchModal = (eventType: string) => {
    setPendingEventType(eventType);
    setCapturedPhotoBase64(null);
    setObservations("");
    setModalOpen(true);
    setTimeout(() => {
      startCamera();
    }, 300);
  };

  // Confirm Punch with WebCam Photo Capture
  const handleConfirmPunch = async () => {
    if (!pendingEventType || !employeeStatus) return;
    setPunching(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const location = await getGPS();
      const timestamp = new Date().toISOString();

      if (navigator.onLine) {
        const res = await api.post("/attendance/kiosk/punch", {
          employee_code: employeeCodeInput.trim() || employeeStatus.employee_id,
          event_type: pendingEventType,
          latitude: location.lat,
          longitude: location.lng,
          photo_base64: capturedPhotoBase64 || undefined,
          break_name: pendingEventType === "break_start" ? breakName : undefined,
          observations: observations || undefined,
          offline_timestamp: timestamp,
        });
        setSuccessMessage(res.data.message || "Evento registrado con éxito");
      } else {
        await saveOfflinePunch({
          type: pendingEventType === "shift_start" ? "start" : "end",
          shift_id: "attendance_kiosk",
          latitude: location.lat,
          longitude: location.lng,
          observations: observations || undefined,
          offline_timestamp: timestamp,
        });
        setSuccessMessage("⚠️ Evento guardado localmente (Modo Offline). Se sincronizará al conectar a red.");
      }

      stopCamera();
      setModalOpen(false);

      // Auto Reset after 4 seconds for the next employee
      setTimeout(() => {
        handleResetKiosk();
      }, 4000);
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.detail || "Error al registrar evento");
    } finally {
      setPunching(false);
    }
  };

  const stateLabels: { [key: string]: { label: string; bg: string; text: string } } = {
    off_shift: { label: "Fuera de Jornada", bg: "bg-slate-100", text: "text-slate-700" },
    in_shift: { label: "En Jornada Laboral", bg: "bg-emerald-100", text: "text-emerald-800" },
    on_break: { label: "En Pausa / Break", bg: "bg-amber-100", text: "text-amber-800" },
    on_lunch: { label: "En Almuerzo / Comida", bg: "bg-orange-100", text: "text-orange-800" },
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 select-none">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          {companyLogo ? (
            <img src={companyLogo} alt="Logo" className="h-10 w-auto object-contain rounded" />
          ) : (
            <div className="h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center font-bold text-white shadow">
              <Building2 className="h-6 w-6" />
            </div>
          )}
          <div>
            <h1 className="text-lg font-black tracking-tight text-white">{companyNameConfig}</h1>
            <p className="text-xs text-slate-400">Estación Fija Kiosk | Control de Asistencia Biométrica</p>
          </div>
        </div>

        <div className="text-right">
          <p className="text-xl font-mono font-black text-cyan-400">{currentTime}</p>
          <p className="text-[11px] text-slate-400 capitalize">{currentDate}</p>
        </div>
      </div>

      {/* Main Kiosk Area */}
      <div className="max-w-xl mx-auto w-full my-auto space-y-6 py-6">
        {/* Step 1: Employee Lookup */}
        {!employeeStatus ? (
          <Card className="bg-slate-900 border-slate-800 text-white shadow-2xl">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto h-16 w-16 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 flex items-center justify-center mb-2">
                <KeyRound className="h-8 w-8" />
              </div>
              <CardTitle className="text-xl font-black">Ingresa tu Código o Número de Cédula</CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Escribe tu código de colaborador para consultar tu estado y registrar marcaciones.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLookupEmployee} className="space-y-4">
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="Ej: 1020304050 o EMP-001"
                    value={employeeCodeInput}
                    onChange={(e) => setEmployeeCodeInput(e.target.value)}
                    className="text-lg font-mono text-center py-6 bg-slate-950 border-slate-800 text-white focus-visible:ring-cyan-500"
                    autoFocus
                  />
                </div>

                {errorMessage && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl flex items-center gap-2">
                    <XCircle className="h-4 w-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={searchingEmp || !employeeCodeInput.trim()}
                  className="w-full py-6 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 font-black text-sm text-white shadow-lg gap-2"
                >
                  {searchingEmp ? <Loader2 className="h-5 w-5 animate-spin" /> : "Consultar Mi Estado"}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          /* Step 2: Employee Action Dashboard */
          <Card className="bg-slate-900 border-slate-800 text-white shadow-2xl">
            <CardHeader className="border-b border-slate-800 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-cyan-400">
                    <User className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-white">{employeeStatus.employee_name}</h2>
                    <p className="text-xs text-slate-400">{employeeStatus.job_position || "Colaborador"} | {employeeStatus.company_name}</p>
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={handleResetKiosk} className="text-xs border-slate-700">
                  Cambiar
                </Button>
              </div>
            </CardHeader>

            <CardContent className="pt-5 space-y-5">
              {successMessage && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{successMessage}</span>
                </div>
              )}

              {/* Allowed Event Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={() => handleOpenPunchModal("shift_start")}
                  className="py-8 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-sm shadow-lg flex-col gap-1"
                >
                  <LogIn className="h-5 w-5" />
                  <span>Entrada de Jornada</span>
                </Button>

                <Button
                  onClick={() => handleOpenPunchModal("shift_end")}
                  className="py-8 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-black text-sm shadow-lg flex-col gap-1"
                >
                  <LogOut className="h-5 w-5" />
                  <span>Salida de Jornada</span>
                </Button>

                <Button
                  onClick={() => handleOpenPunchModal("break_start")}
                  className="py-6 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow gap-1"
                >
                  <Coffee className="h-4 w-4" /> Inicio Pausa / Break
                </Button>

                <Button
                  onClick={() => handleOpenPunchModal("lunch_start")}
                  className="py-6 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow gap-1"
                >
                  <Utensils className="h-4 w-4" /> Inicio Almuerzo
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* WEBCAM CAMERA MODAL FOR KIOSK PUNCH */}
      <Dialog open={modalOpen} onOpenChange={(open) => { if (!open) stopCamera(); setModalOpen(open); }}>
        <DialogContent className="max-w-md bg-slate-900 text-white border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-cyan-400">
              <Camera className="h-5 w-5" /> Verificación Biométrica Facial
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Live WebCam Stream Display */}
            <div className="relative aspect-video bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center">
              {!capturedPhotoBase64 ? (
                <>
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                  <div className="absolute inset-0 border-2 border-dashed border-cyan-500/50 rounded-2xl pointer-events-none flex items-center justify-center">
                    <p className="text-[10px] text-cyan-300 font-mono bg-slate-950/80 px-2 py-1 rounded">Mire a la cámara para verificar</p>
                  </div>
                </>
              ) : (
                <img src={capturedPhotoBase64} alt="Foto Marcación" className="w-full h-full object-cover" />
              )}
              <canvas ref={canvasRef} className="hidden" />
            </div>

            {/* Fallback File Capture */}
            <div className="flex items-center justify-between text-[11px] border-t border-slate-800 pt-2">
              <span className="text-slate-400">¿Problemas con la cámara?</span>
              <label className="text-cyan-400 hover:underline cursor-pointer font-bold flex items-center gap-1">
                <Upload className="h-3.5 w-3.5" /> Subir Foto
                <input type="file" accept="image/*" capture="user" onChange={handleFileCapture} className="hidden" />
              </label>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">Observaciones (Opcional)</label>
              <Input
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                placeholder="Ej: Salida a tiempo..."
                className="bg-slate-950 border-slate-800 text-white text-xs"
              />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {!capturedPhotoBase64 ? (
              <Button onClick={takeCanvasSnapshot} className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs gap-1.5">
                <Camera className="h-4 w-4" /> Capturar Foto Facial
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => { setCapturedPhotoBase64(null); startCamera(); }} className="w-full text-xs">
                  Re-tomar
                </Button>
                <Button
                  onClick={handleConfirmPunch}
                  disabled={punching}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                >
                  {punching ? "Registrando Marcación..." : "Confirmar Marcación Biométrica"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Footer info */}
      <div className="border-t border-slate-800 pt-3 text-center text-[10px] text-slate-500">
        <p>&copy; {new Date().getFullYear()} {companyNameConfig} | Estación de Control Kiosk</p>
      </div>
    </div>
  );
}
