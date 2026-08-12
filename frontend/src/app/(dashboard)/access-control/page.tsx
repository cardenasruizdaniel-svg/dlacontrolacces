"use client";
import React, { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Shield, LogIn, LogOut, MapPin, Camera, RefreshCw, 
  Building2, Clock, Search, UserCheck, AlertCircle, CheckCircle2, User
} from "lucide-react";
import api from "@/lib/api";

export default function AccessControlPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedSede, setSelectedSede] = useState<string>("all");

  const [stats, setStats] = useState({
    entries: 0,
    exits: 0,
    geoVerified: 0,
    faceVerified: 0,
    currentlyActive: 0
  });

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const res = await api.get(`/access/records?start_date=${today}&page_size=100`);
      if (res.data?.items) {
        const items = res.data.items;
        setRecords(items);
        
        let entries = 0, exits = 0, geo = 0, face = 0;
        const activeEmpIds = new Set<string>();

        items.forEach((r: any) => {
          if (r.record_type === "entry") {
            entries++;
            activeEmpIds.add(r.employee_id);
          }
          if (r.record_type === "exit") {
            exits++;
            activeEmpIds.delete(r.employee_id);
          }
          if (r.inside_geofence || r.is_georeferenced) geo++;
          if (r.face_verified || r.is_face_verified) face++;
        });

        setStats({ 
          entries, 
          exits, 
          geoVerified: geo, 
          faceVerified: face,
          currentlyActive: activeEmpIds.size
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
    const interval = setInterval(fetchRecords, 20000);
    return () => clearInterval(interval);
  }, []);

  const sedesList = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      if (r.sede_name) set.add(r.sede_name);
    });
    return Array.from(set);
  }, [records]);

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchesSearch = !search.trim() || 
        r.employee_name?.toLowerCase().includes(search.toLowerCase()) ||
        r.employee_code?.toLowerCase().includes(search.toLowerCase()) ||
        r.employee_document?.toLowerCase().includes(search.toLowerCase()) ||
        r.sede_name?.toLowerCase().includes(search.toLowerCase());

      const matchesType = selectedType === "all" || r.record_type === selectedType;
      const matchesSede = selectedSede === "all" || r.sede_name === selectedSede;

      return matchesSearch && matchesType && matchesSede;
    });
  }, [records, search, selectedType, selectedSede]);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Control de Acceso & Tiempo en Sede</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Monitoreo biométrico y georreferenciado de entradas, salidas y permanencia en sedes</p>
        </div>
        <Button onClick={fetchRecords} disabled={loading} variant="outline" className="gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Actualizar En Vivo
        </Button>
      </div>
      
      {/* Metric Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="p-4 sm:p-5 flex items-center gap-3">
            <div className="rounded-xl bg-blue-50 dark:bg-blue-950 p-2.5 sm:p-3 text-blue-600">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">En Turno Ahora</p>
              <p className="text-xl sm:text-2xl font-bold text-blue-700">{stats.currentlyActive}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-5 flex items-center gap-3">
            <div className="rounded-xl bg-green-50 dark:bg-green-950 p-2.5 sm:p-3 text-green-600">
              <LogIn className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Entradas Hoy</p>
              <p className="text-xl sm:text-2xl font-bold text-green-700">{stats.entries}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-5 flex items-center gap-3">
            <div className="rounded-xl bg-rose-50 dark:bg-rose-950 p-2.5 sm:p-3 text-rose-600">
              <LogOut className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Salidas Hoy</p>
              <p className="text-xl sm:text-2xl font-bold text-rose-700">{stats.exits}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-5 flex items-center gap-3">
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950 p-2.5 sm:p-3 text-emerald-600">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">En Geocerca</p>
              <p className="text-xl sm:text-2xl font-bold text-emerald-700">{stats.geoVerified}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-5 flex items-center gap-3">
            <div className="rounded-xl bg-purple-50 dark:bg-purple-950 p-2.5 sm:p-3 text-purple-600">
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Biometría Facial OK</p>
              <p className="text-xl sm:text-2xl font-bold text-purple-700">{stats.faceVerified}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por empleado, código, cédula o sede..." 
            className="pl-9 pr-8 h-9 text-sm rounded-xl" 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
          />
          {search && (
            <button 
              onClick={() => setSearch("")} 
              className="absolute right-2.5 top-2.5 text-xs text-muted-foreground hover:text-foreground font-bold p-0.5"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            className="h-9 rounded-xl border bg-background px-3 text-xs font-medium"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
          >
            <option value="all">Todas las Marcaciones</option>
            <option value="entry">Solo Entradas</option>
            <option value="exit">Solo Salidas</option>
          </select>

          <select
            className="h-9 rounded-xl border bg-background px-3 text-xs font-medium"
            value={selectedSede}
            onChange={(e) => setSelectedSede(e.target.value)}
          >
            <option value="all">Todas las Sedes</option>
            {sedesList.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>
      
      {/* Live Activity Records */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base sm:text-lg">Registro de Asistencia y Permanencia en Sedes</CardTitle>
              <CardDescription className="text-xs">
                {filteredRecords.length} movimientos registrados en la jornada de hoy
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-300">
              ● Sincronizado en tiempo real
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {loading && records.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground flex flex-col items-center gap-2">
                <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                <p className="text-sm font-medium">Cargando marcaciones en tiempo real...</p>
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-3 opacity-40 text-slate-400" />
                <p className="text-base font-semibold text-slate-700">Sin registros de acceso para los filtros seleccionados</p>
                <p className="text-xs text-muted-foreground mt-1">Los registros aparecen instantáneamente cuando los trabajadores marcan ingreso o salida desde la App móvil.</p>
              </div>
            ) : (
              filteredRecords.map((r) => {
                const isEntry = r.record_type === "entry";
                const isFaceOk = r.face_verified || r.is_face_verified;
                const isGeoOk = r.inside_geofence || r.is_georeferenced;
                const timeStr = r.timestamp ? new Date(r.timestamp).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true }) : "—";
                const elapsedStr = formatElapsed(r.timestamp);

                return (
                  <div key={r.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-muted/40 transition-colors gap-3">
                    <div className="flex items-center gap-3.5">
                      {/* Avatar */}
                      <div className="relative">
                        {r.employee_photo ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img 
                            src={r.employee_photo.startsWith("http") || r.employee_photo.startsWith("data:") ? r.employee_photo : `data:image/jpeg;base64,${r.employee_photo}`} 
                            alt={r.employee_name} 
                            className="h-11 w-11 rounded-full object-cover border-2 border-slate-200" 
                          />
                        ) : (
                          <div className="h-11 w-11 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-600 text-sm border">
                            {r.employee_name ? r.employee_name.slice(0, 2).toUpperCase() : <User className="h-5 w-5" />}
                          </div>
                        )}
                        <span className={`absolute -bottom-1 -right-1 p-0.5 rounded-full text-white ${isEntry ? "bg-green-600" : "bg-rose-600"}`}>
                          {isEntry ? <LogIn className="h-3 w-3" /> : <LogOut className="h-3 w-3" />}
                        </span>
                      </div>

                      {/* Employee and Sede details */}
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm text-foreground">{r.employee_name}</p>
                          <span className="font-mono text-[11px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                            {r.employee_code || r.employee_document}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
                          <span className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1">
                            <Building2 className="h-3.5 w-3.5 text-blue-600" />
                            {r.sede_name || "Sede Principal Central"}
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* Time & Duration & Security Badges */}
                    <div className="flex flex-row sm:flex-col items-start sm:items-end justify-between sm:justify-center gap-1.5 pt-2 sm:pt-0 border-t sm:border-t-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-indigo-600" />
                          {timeStr}
                        </span>
                        {isEntry ? (
                          <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                            En sede: hace {elapsedStr}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] bg-slate-100 text-slate-700">
                            Salida {r.worked_hours ? `(${r.worked_hours}h turno)` : ""}
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {isFaceOk ? (
                          <Badge variant="outline" className="border-purple-200 text-purple-700 bg-purple-50 text-[10px] px-1.5 py-0">
                            <Camera className="h-3 w-3 mr-1"/> Facial OK
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-gray-200 text-gray-400 text-[10px] px-1.5 py-0">
                            <Camera className="h-3 w-3 mr-1"/> Sin Face
                          </Badge>
                        )}
                        
                        {isGeoOk ? (
                          <Badge variant="outline" className="border-emerald-200 text-emerald-700 bg-emerald-50 text-[10px] px-1.5 py-0">
                            <MapPin className="h-3 w-3 mr-1"/> GPS Sede
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-amber-200 text-amber-700 bg-amber-50 text-[10px] px-1.5 py-0">
                            <MapPin className="h-3 w-3 mr-1"/> Fuera Geocerca
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
