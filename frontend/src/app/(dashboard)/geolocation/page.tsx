"use client";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Route, Target, AlertTriangle } from "lucide-react";

export default function GeolocationPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Geolocalización</h1>
          <p className="text-muted-foreground">Mapa en tiempo real, geocercas y rastreo de personal</p>
        </div>
        <Button><Target className="mr-2 h-4 w-4" />Nueva Geocerca</Button>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="p-6 flex items-center gap-4">
          <div className="rounded-xl bg-blue-50 dark:bg-blue-950 p-3"><MapPin className="h-5 w-5 text-blue-600" /></div>
          <div><p className="text-sm text-muted-foreground">Ubicaciones Activas</p><p className="text-2xl font-bold">0</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-6 flex items-center gap-4">
          <div className="rounded-xl bg-green-50 dark:bg-green-950 p-3"><Target className="h-5 w-5 text-green-600" /></div>
          <div><p className="text-sm text-muted-foreground">Geocercas</p><p className="text-2xl font-bold">0</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-6 flex items-center gap-4">
          <div className="rounded-xl bg-purple-50 dark:bg-purple-950 p-3"><Route className="h-5 w-5 text-purple-600" /></div>
          <div><p className="text-sm text-muted-foreground">Rutas Hoy</p><p className="text-2xl font-bold">0</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-6 flex items-center gap-4">
          <div className="rounded-xl bg-red-50 dark:bg-red-950 p-3"><AlertTriangle className="h-5 w-5 text-red-600" /></div>
          <div><p className="text-sm text-muted-foreground">Alertas</p><p className="text-2xl font-bold">0</p></div>
        </CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle>Mapa de Ubicaciones</CardTitle><CardDescription>Vista en tiempo real del personal en campo</CardDescription></CardHeader>
        <CardContent>
          <div className="relative h-[500px] bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <MapPin className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Mapa de Geolocalización</p>
              <p className="text-sm">Google Maps / OpenStreetMap se cargará aquí</p>
              <p className="text-xs mt-2">Configure GOOGLE_MAPS_API_KEY para habilitar</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
