"use client";
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, LogIn, LogOut, MapPin, Camera, RefreshCw } from "lucide-react";
import api from "@/lib/api";

export default function AccessControlPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    entries: 0,
    exits: 0,
    geoVerified: 0,
    faceVerified: 0
  });

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await api.get(`/access/records?start_date=${today}&end_date=${today}&page_size=100`);
      if (res.data?.items) {
        setRecords(res.data.items);
        
        let entries = 0, exits = 0, geo = 0, face = 0;
        res.data.items.forEach((r: any) => {
          if (r.record_type === 'entry') entries++;
          if (r.record_type === 'exit') exits++;
          if (r.is_georeferenced) geo++;
          if (r.is_face_verified) face++;
        });
        setStats({ entries, exits, geoVerified: geo, faceVerified: face });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
    const interval = setInterval(fetchRecords, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Control de Acceso</h1>
          <p className="text-muted-foreground">Registro biométrico de entrada/salida con geolocalización</p>
        </div>
        <Button onClick={fetchRecords} disabled={loading} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>
      
      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="p-6 flex items-center gap-4">
          <div className="rounded-xl bg-green-50 dark:bg-green-950 p-3"><LogIn className="h-5 w-5 text-green-600" /></div>
          <div><p className="text-sm text-muted-foreground">Entradas Hoy</p><p className="text-2xl font-bold">{stats.entries}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-6 flex items-center gap-4">
          <div className="rounded-xl bg-red-50 dark:bg-red-950 p-3"><LogOut className="h-5 w-5 text-red-600" /></div>
          <div><p className="text-sm text-muted-foreground">Salidas Hoy</p><p className="text-2xl font-bold">{stats.exits}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-6 flex items-center gap-4">
          <div className="rounded-xl bg-blue-50 dark:bg-blue-950 p-3"><MapPin className="h-5 w-5 text-blue-600" /></div>
          <div><p className="text-sm text-muted-foreground">Dentro Geocerca</p><p className="text-2xl font-bold">{stats.geoVerified}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-6 flex items-center gap-4">
          <div className="rounded-xl bg-purple-50 dark:bg-purple-950 p-3"><Camera className="h-5 w-5 text-purple-600" /></div>
          <div><p className="text-sm text-muted-foreground">Face Verificado</p><p className="text-2xl font-bold">{stats.faceVerified}</p></div>
        </CardContent></Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Registro de Accesos de Hoy</CardTitle>
          <CardDescription>Historial de entradas y salidas del día actual</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {records.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Shield className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Sin registros hoy</p>
                <p className="text-sm">Los registros de acceso aparecerán aquí cuando los trabajadores inicien/cierren sesión desde la App móvil</p>
              </div>
            ) : (
              <div className="border rounded-md divide-y">
                {records.map((r) => (
                  <div key={r.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between hover:bg-muted/50 transition-colors gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-full ${r.record_type === 'entry' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {r.record_type === 'entry' ? <LogIn className="h-4 w-4" /> : <LogOut className="h-4 w-4" />}
                      </div>
                      <div>
                        <p className="font-medium">{r.employee_name || r.employee_id}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          {new Date(r.timestamp).toLocaleTimeString("es-CO", { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                          {' • '} {r.shift_id ? 'Turno Asignado' : 'Sin Turno'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {r.is_face_verified ? (
                        <Badge variant="outline" className="border-purple-200 text-purple-700 bg-purple-50"><Camera className="h-3 w-3 mr-1"/> Face OK</Badge>
                      ) : (
                        <Badge variant="outline" className="border-gray-200 text-gray-500"><Camera className="h-3 w-3 mr-1"/> No Face</Badge>
                      )}
                      
                      {r.is_georeferenced ? (
                        <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50"><MapPin className="h-3 w-3 mr-1"/> GPS OK</Badge>
                      ) : (
                        <Badge variant="outline" className="border-gray-200 text-gray-500"><MapPin className="h-3 w-3 mr-1"/> Sin GPS</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
