"use client";

import React, { useState, useRef, useEffect } from "react";
import api from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PenTool, Upload, QrCode, CheckCircle2, RotateCcw, Copy, ExternalLink, ShieldCheck } from "lucide-react";

interface DigitalSignatureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractId?: string | null;
  employeeName?: string;
  onSignatureSaved?: (signatureBase64: string, method: string) => void;
}

export default function DigitalSignatureModal({
  open,
  onOpenChange,
  contractId,
  employeeName = "Empleado",
  onSignatureSaved,
}: DigitalSignatureModalProps) {
  const [activeTab, setActiveTab] = useState<"canvas" | "upload" | "qr">("canvas");
  const [saving, setSaving] = useState<boolean>(false);
  const [uploadedBase64, setUploadedBase64] = useState<string | null>(null);
  const [message, setMessage] = useState<string>("");

  // Canvas drawing refs and state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [hasDrawn, setHasDrawn] = useState<boolean>(false);

  // Initialize Canvas
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        setHasDrawn(false);
      }
    }
  };

  useEffect(() => {
    if (open && activeTab === "canvas") {
      setTimeout(() => {
        clearCanvas();
      }, 100);
    }
  }, [open, activeTab]);

  // Touch and Mouse Event Handlers for Signature Drawing
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    setHasDrawn(true);
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx?.beginPath();
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = (clientX - rect.left) * (canvas.width / rect.width);
    const y = (clientY - rect.top) * (canvas.height / rect.height);

    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#0f172a"; // Dark blue stroke for high clarity

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  // Image Upload Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMessage("Por favor seleccione un archivo de imagen válido (.png, .jpg, .jpeg).");
      return;
    }
    const reader = new FileReader();
    reader.onload = (evt) => {
      setUploadedBase64(evt.target?.result as string);
      setMessage("✅ Imagen de firma cargada. Haga clic en Guardar y Firmar.");
    };
    reader.readAsDataURL(file);
  };

  // Save Signature Submission
  const handleSaveSignature = async () => {
    let finalBase64 = "";
    let method = activeTab;

    if (activeTab === "canvas") {
      const canvas = canvasRef.current;
      if (!canvas || !hasDrawn) {
        setMessage("Debe realizar el trazo de la firma en la pantalla antes de guardar.");
        return;
      }
      finalBase64 = canvas.toDataURL("image/png");
    } else if (activeTab === "upload") {
      if (!uploadedBase64) {
        setMessage("Debe seleccionar una imagen de firma.");
        return;
      }
      finalBase64 = uploadedBase64;
    }

    setSaving(true);
    setMessage("");

    try {
      if (contractId) {
        await api.post(`/contracts/${contractId}/sign`, {
          signature_url: finalBase64,
          signature_method: method,
        });
      }

      if (onSignatureSaved) {
        onSignatureSaved(finalBase64, method);
      }

      setMessage("✅ ¡Contrato firmado digitalmente exitosamente!");
      setTimeout(() => {
        onOpenChange(false);
      }, 800);
    } catch (err: any) {
      setMessage(`Error al guardar firma: ${err?.response?.data?.detail || "Intente nuevamente"}`);
    } finally {
      setSaving(false);
    }
  };

  // Generate QR Link for Mobile Signature
  const origin = typeof window !== "undefined" ? window.location.origin : "https://dla-access-enterprise.onrender.com";
  const mobileSignUrl = `${origin}/sign-contract/${contractId || "new"}`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(mobileSignUrl)}`;

  const copyQrLink = () => {
    navigator.clipboard.writeText(mobileSignUrl);
    setMessage("📋 Enlace de firma copiado al portapapeles.");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-slate-900 border-slate-800 text-white shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2 text-cyan-400">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
            Firma Digital de Contrato Laboral
          </DialogTitle>
          <p className="text-xs text-slate-400">
            Colaborador: <strong className="text-white">{employeeName}</strong>
          </p>
        </DialogHeader>

        {/* 3 Tab Modality Selectors */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("canvas")}
            className={`py-2 px-1 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "canvas" ? "bg-cyan-600 text-white shadow" : "text-slate-400 hover:text-white"
            }`}
          >
            <PenTool className="h-3.5 w-3.5" /> En Pantalla
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("upload")}
            className={`py-2 px-1 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "upload" ? "bg-cyan-600 text-white shadow" : "text-slate-400 hover:text-white"
            }`}
          >
            <Upload className="h-3.5 w-3.5" /> Subir Imagen
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("qr")}
            className={`py-2 px-1 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "qr" ? "bg-cyan-600 text-white shadow" : "text-slate-400 hover:text-white"
            }`}
          >
            <QrCode className="h-3.5 w-3.5" /> Código QR Móvil
          </button>
        </div>

        {/* Message Banner */}
        {message && (
          <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-cyan-300 font-medium">
            {message}
          </div>
        )}

        {/* TAB 1: CANVAS PAD */}
        {activeTab === "canvas" && (
          <div className="space-y-3 py-1">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Dibuje su firma dentro del recuadro usando mouse o pantalla táctil:</span>
              <Button size="sm" variant="ghost" onClick={clearCanvas} className="h-7 text-xs text-rose-400 hover:text-rose-300 gap-1">
                <RotateCcw className="h-3 w-3" /> Limpiar Trazo
              </Button>
            </div>

            <div className="relative border-2 border-dashed border-cyan-500/50 rounded-2xl bg-white overflow-hidden shadow-inner cursor-crosshair">
              <canvas
                ref={canvasRef}
                width={500}
                height={200}
                onMouseDown={startDrawing}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onMouseMove={draw}
                onTouchStart={startDrawing}
                onTouchEnd={stopDrawing}
                onTouchMove={draw}
                className="w-full h-44 touch-none"
              />
              {!hasDrawn && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400 text-xs font-semibold select-none">
                  ✍️ Firme aquí con su dedo o mouse
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: UPLOAD IMAGE FILE */}
        {activeTab === "upload" && (
          <div className="space-y-3 py-2 text-xs">
            <p className="text-slate-400">Seleccione un archivo de imagen transparente o fondo claro con su firma manuscrita (.png, .jpg):</p>
            <div className="p-4 border-2 border-dashed border-slate-700 rounded-2xl text-center bg-slate-950 space-y-3">
              {uploadedBase64 ? (
                <div className="space-y-2">
                  <img src={uploadedBase64} alt="Firma Cargada" className="h-28 mx-auto bg-white p-2 rounded-xl object-contain shadow" />
                  <p className="text-emerald-400 font-bold">Firma seleccionada correctamente</p>
                </div>
              ) : (
                <Upload className="h-10 w-10 text-cyan-400 mx-auto opacity-80" />
              )}

              <label className="inline-flex items-center gap-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-xl cursor-pointer shadow">
                <Upload className="h-4 w-4" /> Seleccionar Imagen de Firma
                <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
          </div>
        )}

        {/* TAB 3: QR CODE FOR MOBILE SIGNING */}
        {activeTab === "qr" && (
          <div className="space-y-3 py-2 text-center text-xs">
            <p className="text-slate-300">
              Escanee el siguiente Código QR desde cualquier smartphone para firmar cómodamente en la pantalla del celular:
            </p>

            <div className="p-4 bg-white rounded-2xl w-56 mx-auto shadow-2xl border-4 border-cyan-500/40">
              <img src={qrImageUrl} alt="Código QR de Firma Digital" className="w-48 h-48 mx-auto object-contain" />
            </div>

            <div className="flex items-center justify-center gap-2 pt-1">
              <Button size="sm" variant="outline" onClick={copyQrLink} className="text-xs font-bold gap-1 text-slate-200 border-slate-700">
                <Copy className="h-3.5 w-3.5 text-cyan-400" /> Copiar Enlace
              </Button>
              <a href={mobileSignUrl} target="_blank" rel="noreferrer">
                <Button size="sm" className="text-xs font-bold gap-1 bg-cyan-600 hover:bg-cyan-700 text-white">
                  <ExternalLink className="h-3.5 w-3.5" /> Abrir en Navegador
                </Button>
              </a>
            </div>
          </div>
        )}

        <DialogFooter className="pt-2">
          {activeTab !== "qr" ? (
            <Button
              onClick={handleSaveSignature}
              disabled={saving}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs gap-1.5 py-3 shadow-lg"
            >
              <CheckCircle2 className="h-4 w-4" /> Confirmar & Guardar Firma Digital
            </Button>
          ) : (
            <Button onClick={() => onOpenChange(false)} variant="outline" className="w-full text-xs font-bold text-slate-300 border-slate-700">
              Cerrar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
