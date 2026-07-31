"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, PenTool, CheckCircle2, RotateCcw, Upload, AlertCircle } from "lucide-react";

export default function SignContractClient() {
  const params = useParams();
  const contractId = params?.id as string;

  const [contract, setContract] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [signing, setSigning] = useState<boolean>(false);
  const [isSigned, setIsSigned] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");

  const [activeTab, setActiveTab] = useState<"canvas" | "upload">("canvas");
  const [uploadedBase64, setUploadedBase64] = useState<string | null>(null);

  // Canvas drawing state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [hasDrawn, setHasDrawn] = useState<boolean>(false);

  useEffect(() => {
    if (contractId && contractId !== "default") {
      fetchContractData();
    } else {
      setLoading(false);
    }
  }, [contractId]);

  const fetchContractData = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/public/contracts/${contractId}/signing-data`);
      setContract(res.data);
      if (res.data?.is_signed) {
        setIsSigned(true);
      }
    } catch (err: any) {
      setMessage("No se pudo cargar la información del contrato.");
    } finally {
      setLoading(false);
    }
  };

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
    if (!loading && activeTab === "canvas" && !isSigned) {
      setTimeout(() => clearCanvas(), 200);
    }
  }, [loading, activeTab, isSigned]);

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

    ctx.lineWidth = 3.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#0f172a";

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      setUploadedBase64(evt.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitSignature = async () => {
    let finalBase64 = "";
    if (activeTab === "canvas") {
      const canvas = canvasRef.current;
      if (!canvas || !hasDrawn) {
        setMessage("Por favor dibuje su firma manuscrita dentro del recuadro.");
        return;
      }
      finalBase64 = canvas.toDataURL("image/png");
    } else {
      if (!uploadedBase64) {
        setMessage("Por favor seleccione un archivo de imagen.");
        return;
      }
      finalBase64 = uploadedBase64;
    }

    setSigning(true);
    setMessage("");

    try {
      await api.post(`/public/contracts/${contractId}/sign`, {
        signature_url: finalBase64,
        signature_method: activeTab === "canvas" ? "qr_mobile" : "image_upload",
      });
      setIsSigned(true);
      setMessage("✅ ¡Contrato firmado exitosamente!");
    } catch (err: any) {
      setMessage(`Error: ${err?.response?.data?.detail || "No se pudo registrar firma"}`);
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <p className="text-sm font-bold text-cyan-400 animate-pulse">Cargando datos del contrato laboral...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 max-w-md mx-auto space-y-4 select-none">
      <div className="flex items-center gap-2.5 p-3 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
        <ShieldCheck className="h-7 w-7 text-cyan-400 shrink-0" />
        <div>
          <h1 className="text-sm font-black text-white">DLA Access Enterprise</h1>
          <p className="text-[10px] text-cyan-400 font-mono">Portal Móvil de Firma Digital de Contratos</p>
        </div>
      </div>

      {contract ? (
        <Card className="bg-slate-900 border-slate-800 text-white shadow-2xl">
          <CardHeader className="pb-3 border-b border-slate-800">
            <div className="flex items-center justify-between">
              <Badge className="bg-blue-600 text-white text-[10px] font-bold">
                Código: {contract.code}
              </Badge>
              {isSigned && (
                <Badge className="bg-emerald-600 text-white text-[10px] font-bold flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Firmado
                </Badge>
              )}
            </div>
            <CardTitle className="text-base font-black text-white pt-2">{contract.employee_name}</CardTitle>
            <p className="text-xs text-slate-400">Doc Cédula: <strong className="text-white">{contract.employee_document}</strong></p>
          </CardHeader>

          <CardContent className="p-4 space-y-4 text-xs">
            <div className="p-3 bg-slate-950 rounded-xl space-y-1.5 border border-slate-800">
              <div className="flex justify-between"><span>Salario Base:</span><strong className="text-emerald-400 font-mono">${Number(contract.salary || 0).toLocaleString("es-CO")}</strong></div>
              <div className="flex justify-between"><span>Fecha Inicio:</span><strong className="text-white">{contract.start_date}</strong></div>
              <div className="flex justify-between"><span>Jornada Laboral:</span><strong className="text-cyan-400">{contract.work_scheme || "Tiempo Completo"}</strong></div>
            </div>

            {message && (
              <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                message.includes("Error") ? "bg-rose-500/10 border border-rose-500/30 text-rose-300" : "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
              }`}>
                {message.includes("Error") ? <AlertCircle className="h-4 w-4 shrink-0" /> : <CheckCircle2 className="h-4 w-4 shrink-0" />}
                <span>{message}</span>
              </div>
            )}

            {isSigned ? (
              <div className="p-6 bg-slate-950/80 border border-emerald-500/50 rounded-2xl text-center space-y-3">
                <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto" />
                <h3 className="text-sm font-bold text-white">¡Contrato Firmado Digitalmente!</h3>
                <p className="text-xs text-slate-400">Su firma digital ha sido registrada y respaldada exitosamente en la plataforma de DLA Access Enterprise.</p>
                {contract.signature_url && (
                  <img src={contract.signature_url} alt="Firma Registrada" className="h-16 mx-auto bg-white p-2 rounded-xl object-contain shadow" />
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => setActiveTab("canvas")}
                    className={`py-2 rounded-lg font-bold transition-all flex items-center justify-center gap-1 ${
                      activeTab === "canvas" ? "bg-cyan-600 text-white shadow" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <PenTool className="h-3.5 w-3.5" /> Trazo Digital
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("upload")}
                    className={`py-2 rounded-lg font-bold transition-all flex items-center justify-center gap-1 ${
                      activeTab === "upload" ? "bg-cyan-600 text-white shadow" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Upload className="h-3.5 w-3.5" /> Cargar Imagen
                  </button>
                </div>

                {activeTab === "canvas" ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Dibuje su firma en la pantalla con el dedo:</span>
                      <Button size="sm" variant="ghost" onClick={clearCanvas} className="h-6 text-[10px] text-rose-400 hover:text-rose-300 gap-1">
                        <RotateCcw className="h-3 w-3" /> Limpiar
                      </Button>
                    </div>

                    <div className="relative border-2 border-dashed border-cyan-500/50 rounded-2xl bg-white overflow-hidden shadow-inner">
                      <canvas
                        ref={canvasRef}
                        width={400}
                        height={180}
                        onMouseDown={startDrawing}
                        onMouseUp={stopDrawing}
                        onMouseMove={draw}
                        onTouchStart={startDrawing}
                        onTouchEnd={stopDrawing}
                        onTouchMove={draw}
                        className="w-full h-40 touch-none"
                      />
                      {!hasDrawn && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400 text-xs font-semibold">
                          ✍️ Firme aquí con su dedo
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 border-2 border-dashed border-slate-700 rounded-2xl text-center bg-slate-950 space-y-2">
                    {uploadedBase64 ? (
                      <img src={uploadedBase64} alt="Firma Cargada" className="h-24 mx-auto bg-white p-2 rounded-xl object-contain shadow" />
                    ) : (
                      <Upload className="h-8 w-8 text-cyan-400 mx-auto" />
                    )}
                    <label className="inline-flex items-center gap-1 px-3 py-1.5 bg-cyan-600 text-white font-bold rounded-xl text-xs cursor-pointer">
                      Subir Imagen de Firma
                      <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                    </label>
                  </div>
                )}

                <Button
                  onClick={handleSubmitSignature}
                  disabled={signing}
                  className="w-full py-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-sm gap-2 shadow-xl"
                >
                  <CheckCircle2 className="h-5 w-5" />
                  <span>Confirmar & Guardar Mi Firma Digital</span>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-slate-900 border-slate-800 text-white text-center py-6">
          <CardContent>
            <p className="text-xs text-rose-400">Contrato no encontrado o enlace de firma sin especificar.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
