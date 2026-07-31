"use client";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, LogIn, LogOut, MapPin, Camera, CheckCircle, XCircle } from "lucide-react";

export default function AccessControlPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Control de Acceso</h1>
        <p className="text-muted-foreground">Registro biométrico de entrada/salida con geolocalización</p>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="p-6 flex items-center gap-4">
          <div className="rounded-xl bg-green-50 dark:bg-green-950 p-3"><LogIn className="h-5 w-5 text-green-600" /></div>
          <div><p className="text-sm text-muted-foreground">Entradas Hoy</p><p className="text-2xl font-bold">0</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-6 flex items-center gap-4">
          <div className="rounded-xl bg-red-50 dark:bg-red-950 p-3"><LogOut className="h-5 w-5 text-red-600" /></div>
          <div><p className="text-sm text-muted-foreground">Salidas Hoy</p><p className="text-2xl font-bold">0</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-6 flex items-center gap-4">
          <div className="rounded-xl bg-blue-50 dark:bg-blue-950 p-3"><MapPin className="h-5 w-5 text-blue-600" /></div>
          <div><p className="text-sm text-muted-foreground">Dentro Geocerca</p><p className="text-2xl font-bold">0</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-6 flex items-center gap-4">
          <div className="rounded-xl bg-purple-50 dark:bg-purple-950 p-3"><Camera className="h-5 w-5 text-purple-600" /></div>
          <div><p className="text-sm text-muted-foreground">Face Verificado</p><p className="text-2xl font-bold">0</p></div>
        </CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle>Registro de Accesos de Hoy</CardTitle><CardDescription>Historial de entradas y salidas del día actual</CardDescription></CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="text-center py-12 text-muted-foreground">
              <Shield className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Sin registros hoy</p>
              <p className="text-sm">Los registros de acceso aparecerán aquí cuando los trabajadores inicien/cierren sesión desde la App móvil</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
