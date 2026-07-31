"use client";

import React, { useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import MobileShiftView from "@/components/mobile/MobileShiftView";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Smartphone, ShieldCheck, Copy, Sparkles, CheckCircle2, Wifi, Zap
} from "lucide-react";

export default function MobilePreviewPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.is_superuser || user?.role_id;
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.origin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 text-center">
        <ShieldCheck className="h-16 w-16 text-muted-foreground animate-bounce" />
        <h2 className="text-xl font-bold">Acceso Restringido</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          El simulador de la App Móvil PWA está reservado exclusivamente para los administradores del sistema.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Banner Superior de Administración */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-card p-6 rounded-2xl border shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Aplicación Móvil PWA Enterprise</h1>
            <Badge variant="default" className="bg-gradient-to-r from-blue-600 to-indigo-600">
              Instalable Multiplataforma
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Plataforma unificada para Android, iOS, Tablets y Escritorio. Incluye soporte offline, Service Worker, IndexedDB y marcación con geolocalización + biometría facial.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={handleCopyLink} className="gap-2">
            <Copy className="h-4 w-4" />
            {copied ? "¡Enlace Copiado!" : "Copiar Enlace PWA"}
          </Button>
        </div>
      </div>

      {/* Grid Principal: Pantalla Operativa Móvil PWA & Panel de Estado */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LADO IZQUIERDO: VISTA OPERATIVA PWA DE MARCADOR */}
        <div className="lg:col-span-6">
          <MobileShiftView />
        </div>

        {/* LADO DERECHO: DETALLES DE COMPATIBILIDAD PWA ENTERPRISE */}
        <div className="lg:col-span-6 space-y-6">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Especificaciones PWA Enterprise
              </CardTitle>
              <CardDescription>
                Capacidades nativas activas en la Progressive Web App de DLA Access.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted/40 rounded-xl border space-y-1">
                  <p className="text-xs text-muted-foreground">Modo Instalación</p>
                  <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">Standalone App</p>
                  <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">Android / iOS / Desktop</Badge>
                </div>
                <div className="p-4 bg-muted/40 rounded-xl border space-y-1">
                  <p className="text-xs text-muted-foreground">Motor Offline</p>
                  <p className="text-sm font-bold text-blue-600 dark:text-blue-400">IndexedDB Queue</p>
                  <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">Auto Background Sync</Badge>
                </div>
              </div>

              <div className="space-y-3 border-t pt-4">
                <h4 className="text-sm font-bold flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Plataformas Compatibles Probadas
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground font-medium">
                  <div className="p-2 bg-card rounded border flex items-center gap-2">
                    <Zap className="h-3.5 w-3.5 text-blue-500" /> Android (Chrome, Edge)
                  </div>
                  <div className="p-2 bg-card rounded border flex items-center gap-2">
                    <Zap className="h-3.5 w-3.5 text-indigo-500" /> iPhone / iPad (Safari iOS)
                  </div>
                  <div className="p-2 bg-card rounded border flex items-center gap-2">
                    <Zap className="h-3.5 w-3.5 text-slate-500" /> Windows / macOS / Linux
                  </div>
                  <div className="p-2 bg-card rounded border flex items-center gap-2">
                    <Zap className="h-3.5 w-3.5 text-emerald-500" /> Tablets Android & iPadOS
                  </div>
                </div>
              </div>

              <div className="p-4 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl space-y-2">
                <h4 className="text-sm font-bold text-blue-900 dark:text-blue-300 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-blue-600" />
                  Sincronización Inteligente de Marcación
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Si un colaborador se encuentra en un área sin señal celular o cobertura de red, el sistema guardará el registro de entrada o salida en la base de datos interna `IndexedDB` manteniendo la **fecha y hora exacta original (`offline_timestamp`)**. Al recuperar la conexión, la PWA sincronizará automáticamente la marcación con el backend FastAPI sin pérdida de información.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
