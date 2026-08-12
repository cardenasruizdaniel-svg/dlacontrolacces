"use client";
import React, { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Users, UserCheck, UserX, Clock, AlertTriangle, DollarSign, 
  Activity, TrendingUp, Building2, MapPin, Camera, RefreshCw, LogIn, LogOut, Shield
} from "lucide-react";

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const companyId = (typeof window !== "undefined" ? localStorage.getItem("company_id") : null) || "dla-company-main";
      const [dashRes, actRes] = await Promise.allSettled([
        api.get(`/dashboard?company_id=${companyId}`),
        api.get(`/dashboard/recent-activity?limit=12`),
      ]);

      if (dashRes.status === "fulfilled") {
        setData(dashRes.value.data);
      }
      if (actRes.status === "fulfilled") {
        setRecentActivity(actRes.value.data || []);
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 25000);
    return () => clearInterval(interval);
  }, [loadData]);

  const formatElapsed = (timestampStr: string) => {
    try {
      const recordTime = new Date(timestampStr).getTime();
      const now = new Date().getTime();
      const diffMs = Math.max(0, now - recordTime);
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      if (hours === 0) return `${mins} min`;
      return `${hours}h ${mins}m`;
    } catch {
      return "—";
    }
  };

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse"><CardContent className="p-6"><div className="h-20 bg-muted rounded" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  const stats = data || {
    employees: { total_active: 0, active_today: 0, absent_today: 0, late_today: 0, on_time_today: 0 },
    hours: { total_worked: 0, total_overtime: 0, average_per_employee: 0 },
    financial: { current_month_cost: 0, cost_per_employee: 0 },
    productivity: { total_shifts: 0, completed: 0, in_progress: 0, absent: 0, completion_rate: 0 },
  };

  const cards = [
    { title: "Empleados Activos", value: stats.employees.total_active, icon: Users, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950" },
    { title: "En Turno Hoy", value: stats.employees.active_today, icon: UserCheck, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950" },
    { title: "Ausentes Hoy", value: stats.employees.absent_today, icon: UserX, color: "text-red-600", bg: "bg-red-50 dark:bg-red-950" },
    { title: "Horas Trabajadas", value: `${stats.hours.total_worked}h`, icon: Clock, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950" },
    { title: "Horas Extra", value: `${stats.hours.total_overtime}h`, icon: AlertTriangle, color: "text-yellow-600", bg: "bg-yellow-50 dark:bg-yellow-950" },
    { title: "Costo Nómina", value: formatCurrency(stats.financial.current_month_cost), icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950" },
    { title: "Retardos Hoy", value: stats.employees.late_today, icon: AlertTriangle, color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-950" },
    { title: "Tasa Completado", value: `${stats.productivity.completion_rate}%`, icon: TrendingUp, color: "text-indigo-600", bg: "bg-indigo-50 dark:bg-indigo-950" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard Ejecutivo</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Monitoreo de Sedes, Control de Asistencia y Productividad en Tiempo Real</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 text-xs py-1">
            <Activity className="mr-1 h-3 w-3 animate-pulse" /> Monitoreo En Vivo
          </Badge>
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading} className="h-8 gap-1 text-xs">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Tarjetas Principales de Métricas */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title} className="transition-shadow hover:shadow-md">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{card.title}</p>
                  <p className="text-xl sm:text-2xl font-bold mt-1">{card.value}</p>
                </div>
                <div className={`rounded-xl p-2.5 sm:p-3 ${card.bg}`}>
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Monitoreo en Vivo de Personal por Sede, Tiempo y Hora */}
      <Card className="border-blue-100 dark:border-blue-900 shadow-sm">
        <CardHeader className="pb-3 border-b bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-600" />
                Personal en Sede & Tiempo de Turno en Vivo
              </CardTitle>
              <CardDescription className="text-xs">
                Ubicación actual por sede/subsede, hora de ingreso y permanencia activa
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
              {recentActivity.length} movimientos recientes
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {recentActivity.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Shield className="h-10 w-10 mx-auto mb-2 opacity-40 text-slate-400" />
              <p className="text-sm font-semibold text-slate-700">Sin marcaciones activas hoy</p>
              <p className="text-xs text-muted-foreground">Las entradas registradas desde la App aparecerán aquí con su sede y tiempo en puesto.</p>
            </div>
          ) : (
            <div className="divide-y max-h-[380px] overflow-y-auto">
              {recentActivity.map((r) => {
                const isEntry = r.record_type === "entry";
                const isFaceOk = r.face_verified || r.is_face_verified;
                const isGeoOk = r.inside_geofence || r.is_georeferenced;
                const timeStr = r.timestamp ? new Date(r.timestamp).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true }) : "—";
                const elapsedStr = formatElapsed(r.timestamp);

                return (
                  <div key={r.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-muted/30 transition-colors gap-3">
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className="relative">
                        {r.employee_photo ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img 
                            src={r.employee_photo.startsWith("http") || r.employee_photo.startsWith("data:") ? r.employee_photo : `data:image/jpeg;base64,${r.employee_photo}`} 
                            alt={r.employee_name} 
                            className="h-10 w-10 rounded-full object-cover border" 
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-600 text-xs border">
                            {r.employee_name ? r.employee_name.slice(0, 2).toUpperCase() : "EM"}
                          </div>
                        )}
                        <span className={`absolute -bottom-1 -right-1 p-0.5 rounded-full text-white ${isEntry ? "bg-green-600" : "bg-rose-600"}`}>
                          {isEntry ? <LogIn className="h-2.5 w-2.5" /> : <LogOut className="h-2.5 w-2.5" />}
                        </span>
                      </div>

                      {/* Employee details */}
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm text-foreground">{r.employee_name}</p>
                          <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-1 rounded">
                            {r.employee_code}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Building2 className="h-3 w-3 text-blue-600 shrink-0" />
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            {r.sede_name || "Sede Principal"}
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* Sede Time & Verification Badges */}
                    <div className="flex items-center justify-between sm:justify-end gap-3">
                      <div className="text-left sm:text-right">
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center sm:justify-end gap-1">
                          <Clock className="h-3 w-3 text-indigo-600" />
                          {timeStr}
                        </p>
                        {isEntry ? (
                          <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded">
                            En sede: {elapsedStr}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-500">
                            Salida registrada
                          </span>
                        )}
                      </div>

                      <div className="flex flex-col gap-1 items-end">
                        {isFaceOk ? (
                          <Badge variant="outline" className="border-purple-200 text-purple-700 bg-purple-50 text-[9px] px-1 py-0">
                            <Camera className="h-2.5 w-2.5 mr-0.5"/> Facial OK
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-gray-200 text-gray-400 text-[9px] px-1 py-0">
                            Sin Face
                          </Badge>
                        )}
                        {isGeoOk ? (
                          <Badge variant="outline" className="border-emerald-200 text-emerald-700 bg-emerald-50 text-[9px] px-1 py-0">
                            <MapPin className="h-2.5 w-2.5 mr-0.5"/> En Geocerca
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-amber-200 text-amber-700 bg-amber-50 text-[9px] px-1 py-0">
                            Fuera Geocerca
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detalle Operativo y Resumen Financiero */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Cumplimiento de Turnos de Hoy</CardTitle>
            <CardDescription>Resumen de ejecución de turnos operativos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-2.5 rounded-lg bg-muted/40">
                <span className="text-sm">Turnos programados</span>
                <Badge variant="secondary" className="font-bold">{stats.productivity.total_shifts}</Badge>
              </div>
              <div className="flex justify-between items-center p-2.5 rounded-lg bg-green-50/50 dark:bg-green-950/30">
                <span className="text-sm text-green-900 dark:text-green-200 font-medium">Completados</span>
                <Badge className="bg-green-600 text-white">{stats.productivity.completed}</Badge>
              </div>
              <div className="flex justify-between items-center p-2.5 rounded-lg bg-blue-50/50 dark:bg-blue-950/30">
                <span className="text-sm text-blue-900 dark:text-blue-200 font-medium">En progreso en sedes</span>
                <Badge className="bg-blue-600 text-white">{stats.productivity.in_progress}</Badge>
              </div>
              <div className="flex justify-between items-center p-2.5 rounded-lg bg-red-50/50 dark:bg-red-950/30">
                <span className="text-sm text-red-900 dark:text-red-200 font-medium">Ausencias reportadas</span>
                <Badge variant="destructive">{stats.productivity.absent}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resumen Financiero y de Jornada</CardTitle>
            <CardDescription>Costos acumulados y métricas laborales del período</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-2.5 rounded-lg bg-muted/40">
                <span className="text-sm">Costo total nómina</span>
                <span className="font-bold text-foreground">{formatCurrency(stats.financial.current_month_cost)}</span>
              </div>
              <div className="flex justify-between items-center p-2.5 rounded-lg bg-muted/40">
                <span className="text-sm">Costo promedio por empleado</span>
                <span className="font-bold text-foreground">{formatCurrency(stats.financial.cost_per_employee)}</span>
              </div>
              <div className="flex justify-between items-center p-2.5 rounded-lg bg-muted/40">
                <span className="text-sm">Horas promedio por empleado</span>
                <span className="font-bold text-foreground">{stats.hours.average_per_employee}h</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
