"use client";
import React, { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";
import { Button } from "@/components/ui/button";
import { Camera, X, RefreshCw, CheckCircle2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface FaceScanOverlayProps {
  onCapture: (base64Image: string) => void;
  onCancel: () => void;
}

export default function FaceScanOverlay({ onCapture, onCancel }: FaceScanOverlayProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isModelsLoaded, setIsModelsLoaded] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("Cargando modelo biométrico...");
  const [isSuccess, setIsSuccess] = useState(false);
  
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number>();
  const progressRef = useRef(0);

  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = "/models";
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        ]);
        setIsModelsLoaded(true);
        setStatusText("Iniciando cámara...");
        startCamera();
      } catch (err) {
        console.error("Error loading models", err);
        setStatusText("Error cargando modelos de IA.");
      }
    };
    
    loadModels();

    return () => {
      stopCamera();
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        videoRef.current.onloadedmetadata = () => {
          setStatusText("Ubica tu rostro dentro del óvalo");
          startFaceDetection();
        };
      }
    } catch (err) {
      console.error("Error accessing camera", err);
      setStatusText("Permiso de cámara denegado o no disponible.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  const startFaceDetection = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    
    const detect = async () => {
      if (video.paused || video.ended || isSuccess) return;

      const detection = await faceapi.detectSingleFace(
        video, 
        new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 })
      );

      if (detection) {
        // Face found!
        const box = detection.box;
        // Validate if face is somewhat centered and reasonably sized
        const videoWidth = video.videoWidth;
        const videoHeight = video.videoHeight;
        
        const isCentered = 
          box.x > videoWidth * 0.1 && 
          box.right < videoWidth * 0.9 &&
          box.y > videoHeight * 0.1 &&
          box.bottom < videoHeight * 0.9;
          
        const isLargeEnough = box.width > videoWidth * 0.25;

        if (isCentered && isLargeEnough) {
          setStatusText("Escaneando rostro... Mantente quieto.");
          progressRef.current = Math.min(progressRef.current + 3, 100);
        } else {
          setStatusText("Acércate y centra tu rostro");
          progressRef.current = Math.max(progressRef.current - 2, 0);
        }
      } else {
        setStatusText("No se detecta rostro. Ubícate en el óvalo.");
        progressRef.current = Math.max(progressRef.current - 5, 0);
      }
      
      setProgress(progressRef.current);

      if (progressRef.current >= 100 && !isSuccess) {
        setIsSuccess(true);
        setStatusText("¡Rostro verificado exitosamente!");
        setTimeout(() => takePhotoAndReturn(), 800);
        return;
      }

      animationFrameRef.current = requestAnimationFrame(detect);
    };
    
    detect();
  };

  const takePhotoAndReturn = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      // Mirror the image horizontally just like the preview
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
      stopCamera();
      onCapture(dataUrl);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm flex flex-col items-center gap-6">
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold text-white">Face ID Reference</h2>
          <p className="text-sm text-slate-300 min-h-[40px] px-4">{statusText}</p>
        </div>

        <div className="relative w-64 h-80 rounded-[100px] overflow-hidden border-4 border-slate-700 shadow-2xl flex items-center justify-center bg-slate-800">
          {!isModelsLoaded ? (
            <div className="flex flex-col items-center text-slate-400 gap-3">
              <RefreshCw className="h-8 w-8 animate-spin" />
              <span className="text-xs font-semibold uppercase tracking-wider">Cargando IA</span>
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
              
              {/* Overlay guides */}
              <div className="absolute inset-0 border-[6px] border-transparent rounded-[100px] pointer-events-none transition-all duration-300"
                style={{ 
                  borderColor: isSuccess ? '#10b981' : progress > 50 ? '#3b82f6' : 'transparent',
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
                <div className="absolute inset-0 flex items-center justify-center bg-emerald-500/20 backdrop-blur-sm z-20">
                  <CheckCircle2 className="w-20 h-20 text-emerald-400 animate-in zoom-in" />
                </div>
              )}
            </>
          )}
        </div>

        <div className="w-full px-6 space-y-2">
          <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <span>Escaneo Biométrico</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2 bg-slate-800" indicatorClassName={isSuccess ? "bg-emerald-500" : "bg-blue-500"} />
        </div>

        <div className="flex justify-center gap-4 w-full mt-4">
          <Button 
            variant="outline" 
            onClick={() => { stopCamera(); onCancel(); }}
            className="rounded-full px-8 border-slate-600 text-slate-300 hover:bg-slate-800 bg-transparent"
          >
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}
