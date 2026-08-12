"use client";
import React, { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";
import { Button } from "@/components/ui/button";
import { Camera, X, RefreshCw, CheckCircle2, UploadCloud, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface FaceScanOverlayProps {
  onCapture: (base64Image: string) => void;
  onCancel: () => void;
}

export default function FaceScanOverlay({ onCapture, onCancel }: FaceScanOverlayProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isModelsLoaded, setIsModelsLoaded] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("Iniciando cámara y biometría...");
  const [isSuccess, setIsSuccess] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number>();
  const progressRef = useRef(0);
  const aiSupportedRef = useRef(true);

  useEffect(() => {
    let isCancelled = false;

    const loadModelsAndStart = async () => {
      // Set a 3s timeout to fallback if models are slow to load
      const timeout = setTimeout(() => {
        if (!isCancelled && !isModelsLoaded) {
          aiSupportedRef.current = false;
          setIsModelsLoaded(true);
          setStatusText("Cámara lista. Ubica tu rostro y pulsa 'Capturar Foto'.");
          startCamera();
        }
      }, 3000);

      try {
        const MODEL_URL = "/models";
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        ]);
        clearTimeout(timeout);
        if (!isCancelled) {
          setIsModelsLoaded(true);
          setStatusText("Iniciando cámara...");
          startCamera();
        }
      } catch (err) {
        clearTimeout(timeout);
        console.warn("Could not load AI models, falling back to direct camera:", err);
        if (!isCancelled) {
          aiSupportedRef.current = false;
          setIsModelsLoaded(true);
          setStatusText("Cámara lista. Ubica tu rostro y pulsa 'Capturar Foto'.");
          startCamera();
        }
      }
    };
    
    loadModelsAndStart();

    return () => {
      isCancelled = true;
      stopCamera();
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  const startCamera = async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            videoRef.current.play().catch(() => {});
          }
          if (aiSupportedRef.current) {
            setStatusText("Ubica tu rostro dentro del óvalo");
            startFaceDetection();
          } else {
            setStatusText("Ubica tu rostro centrado y pulsa 'Capturar Foto'");
          }
        };
      }
    } catch (err: any) {
      console.error("Error accessing camera", err);
      setCameraError("No se pudo acceder a la cámara. Revisa los permisos o sube una foto.");
      setStatusText("Permiso de cámara denegado o dispositivo sin cámara.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const startFaceDetection = () => {
    if (!videoRef.current || !canvasRef.current || !aiSupportedRef.current) return;
    const video = videoRef.current;
    
    const detect = async () => {
      if (video.paused || video.ended || isSuccess) return;

      try {
        if (faceapi.nets.tinyFaceDetector.params) {
          const detection = await faceapi.detectSingleFace(
            video, 
            new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.45 })
          );

          if (detection) {
            const box = detection.box;
            const videoWidth = video.videoWidth || 640;
            const videoHeight = video.videoHeight || 480;
            
            const isCentered = 
              box.x > videoWidth * 0.05 && 
              box.right < videoWidth * 0.95 &&
              box.y > videoHeight * 0.05 &&
              box.bottom < videoHeight * 0.95;
              
            const isLargeEnough = box.width > videoWidth * 0.2;

            if (isCentered && isLargeEnough) {
              setStatusText("Escaneando rostro... Mantente quieto.");
              progressRef.current = Math.min(progressRef.current + 4, 100);
            } else {
              setStatusText("Acércate y centra tu rostro");
              progressRef.current = Math.max(progressRef.current - 2, 0);
            }
          } else {
            setStatusText("Ubica tu rostro dentro del encuadre");
            progressRef.current = Math.max(progressRef.current - 3, 0);
          }
          
          setProgress(progressRef.current);
        }
      } catch (err: any) {
        console.warn("Detection cycle skipped:", err);
      }

      if (progressRef.current >= 100 && !isSuccess) {
        setIsSuccess(true);
        setStatusText("¡Rostro verificado exitosamente!");
        setTimeout(() => takePhotoAndReturn(), 600);
        return;
      }

      animationFrameRef.current = requestAnimationFrame(detect);
    };
    
    detect();
  };

  const takePhotoAndReturn = () => {
    if (!videoRef.current) return;
    try {
      const canvas = document.createElement("canvas");
      const video = videoRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        // Mirror the image horizontally to match what user sees
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
        stopCamera();
        onCapture(dataUrl);
      }
    } catch (e) {
      console.error("Error capturing photo:", e);
    }
  };

  const handleManualCapture = () => {
    setIsSuccess(true);
    setStatusText("¡Foto capturada correctamente!");
    setTimeout(() => {
      takePhotoAndReturn();
    }, 400);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        stopCamera();
        setIsSuccess(true);
        setStatusText("¡Foto cargada exitosamente!");
        setTimeout(() => onCapture(result), 400);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm flex flex-col items-center gap-5">
        <div className="text-center space-y-1">
          <h2 className="text-lg font-black text-white tracking-tight">Registro de Foto Biometría</h2>
          <p className="text-xs text-slate-300 min-h-[32px] px-2">{statusText}</p>
        </div>

        <div className="relative w-64 h-80 rounded-[80px] overflow-hidden border-4 border-slate-700 shadow-2xl flex items-center justify-center bg-slate-900">
          {!isModelsLoaded && !cameraError ? (
            <div className="flex flex-col items-center text-slate-400 gap-3">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
              <span className="text-xs font-semibold tracking-wider">Iniciando cámara...</span>
            </div>
          ) : cameraError ? (
            <div className="p-4 text-center space-y-3">
              <AlertCircle className="h-10 w-10 text-amber-400 mx-auto" />
              <p className="text-xs text-slate-300">{cameraError}</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="bg-slate-800 text-white border-slate-600 text-xs"
              >
                <UploadCloud className="h-3.5 w-3.5 mr-1.5" /> Subir desde Galería
              </Button>
            </div>
          ) : (
            <>
              <video 
                ref={videoRef}
                autoPlay 
                playsInline 
                muted
                className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
              />
              <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
              
              {/* Oval guide overlay */}
              <div 
                className="absolute inset-0 border-[5px] border-dashed border-white/40 rounded-[80px] pointer-events-none transition-all duration-300"
                style={{ 
                  borderColor: isSuccess ? '#10b981' : progress > 50 ? '#3b82f6' : 'rgba(255,255,255,0.4)',
                  boxShadow: progress > 0 ? `inset 0 0 20px ${progress > 50 ? 'rgba(59, 130, 246, 0.5)' : 'rgba(255, 255, 255, 0.2)'}` : 'none'
                }}
              />
              
              {/* Scanner line effect */}
              {progress > 0 && progress < 100 && (
                <div 
                  className="absolute left-0 right-0 h-1 bg-blue-500 shadow-[0_0_8px_2px_rgba(59,130,246,0.5)] z-10"
                  style={{ top: `${progress}%`, transition: 'top 0.1s linear' }}
                />
              )}

              {isSuccess && (
                <div className="absolute inset-0 flex items-center justify-center bg-emerald-500/30 backdrop-blur-sm z-20">
                  <CheckCircle2 className="w-20 h-20 text-emerald-400 animate-in zoom-in" />
                </div>
              )}
            </>
          )}
        </div>

        {/* Progress bar if automated */}
        {aiSupportedRef.current && progress > 0 && (
          <div className="w-full px-4 space-y-1.5">
            <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <span>Escaneo Biométrico</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-1.5 bg-slate-800" indicatorClassName={isSuccess ? "bg-emerald-500" : "bg-blue-500"} />
          </div>
        )}

        {/* Manual Instant Capture & Fallback Controls */}
        <div className="flex flex-col gap-2 w-full px-4">
          <Button 
            onClick={handleManualCapture}
            disabled={isSuccess}
            className="w-full py-5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold text-sm rounded-xl shadow-lg flex items-center justify-center gap-2"
          >
            <Camera className="w-5 h-5" />
            <span>Capturar Foto Ahora</span>
          </Button>

          <input 
            type="file" 
            accept="image/*" 
            capture="user" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={handleFileUpload} 
          />

          <div className="flex gap-2 justify-center w-full mt-1">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs text-slate-400 hover:text-white"
            >
              <UploadCloud className="w-3.5 h-3.5 mr-1" /> Subir Imagen
            </Button>

            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => { stopCamera(); onCancel(); }}
              className="text-xs text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5 mr-1" /> Cancelar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
