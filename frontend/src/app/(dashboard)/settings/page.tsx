"use client";
import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Shield, Building2, ListChecks, Plus, Pencil, Trash2, CheckCircle2, AlertCircle, MapPin, Key, Save, Loader2, Settings, Upload, Clock, Camera } from "lucide-react";
import { useSystemConfig } from "@/lib/useSystemConfig";

type CatalogCategory = "departments" | "cities" | "eps" | "arl" | "afp" | "banks";

interface CatalogItem {
  id: string;
  name: string;
  code?: string;
  department?: string;
  is_active?: boolean;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<CatalogCategory>("departments");
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [deptInput, setDeptInput] = useState("");
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // System Configuration Hook
  const { configs, loading: loadingConfigs, savingKey, updateConfig } = useSystemConfig();
  const [localConfigs, setLocalConfigs] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (configs && configs.length > 0) {
      const map: { [key: string]: string } = {};
      configs.forEach((c) => {
        map[c.key] = c.value || "";
      });
      setLocalConfigs(map);
    }
  }, [configs]);

  const [departments, setDepartments] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);

  useEffect(() => {
    const fetchLocs = async () => {
      try {
        const [depRes, cityRes] = await Promise.all([
          api.get("/catalogs/departments"),
          api.get("/catalogs/cities")
        ]);
        setDepartments(depRes.data || []);
        setCities(cityRes.data || []);
      } catch (err) {}
    };
    fetchLocs();
  }, []);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const loadCatalog = async (cat: CatalogCategory) => {
    setLoadingCatalog(true);
    try {
      const res = await api.get(`/catalogs/${cat}`);
      setItems(res.data || []);
    } catch {
      setItems([]);
    }
    setLoadingCatalog(false);
  };

  useEffect(() => {
    loadCatalog(activeTab);
  }, [activeTab]);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setNameInput("");
    setDeptInput("");
    setDialogOpen(true);
  };

  const handleOpenEdit = (item: CatalogItem) => {
    setEditingItem(item);
    setNameInput(item.name);
    setDeptInput(item.department || "");
    setDialogOpen(true);
  };

  const handleSaveCatalog = async () => {
    if (!nameInput.trim()) return;
    try {
      if (editingItem) {
        await api.put(`/catalogs/${activeTab}/${editingItem.id}`, {
          name: nameInput,
          department: activeTab === "cities" ? deptInput : undefined,
        });
        showToast("success", "Elemento actualizado correctamente");
      } else {
        await api.post(`/catalogs/${activeTab}`, {
          name: nameInput,
          department: activeTab === "cities" ? deptInput : undefined,
        });
        showToast("success", "Elemento agregado a la tabla maestra");
      }
      setDialogOpen(false);
      loadCatalog(activeTab);
    } catch (e: any) {
      showToast("error", e?.response?.data?.detail || "Error al guardar");
    }
  };

  const handleDeleteCatalog = async (id: string) => {
    if (!confirm("¿Está seguro de eliminar este elemento de la tabla maestra?")) return;
    try {
      await api.delete(`/catalogs/${activeTab}/${id}`);
      showToast("success", "Elemento eliminado correctamente");
      loadCatalog(activeTab);
    } catch {
      showToast("error", "Error al eliminar el elemento");
    }
  };

  const handleSaveConfigItem = async (key: string, description?: string, explicitValue?: string) => {
    const val = explicitValue !== undefined ? explicitValue : (localConfigs[key] ?? "");
    const res = await updateConfig(key, val, description);
    if (res.success) {
      showToast("success", `Configuración de '${key}' guardada correctamente`);
    } else {
      showToast("error", res.error || "Error al guardar configuración");
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-white text-sm ${toast.type === "success" ? "bg-green-600" : "bg-red-600"}`}>
          {toast.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {toast.message}
        </div>
      )}

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configuración del Sistema</h1>
        <p className="text-muted-foreground">Parámetros generales, integraciones de Google Maps, geolocalización y tablas maestras de DLA Access Enterprise</p>
      </div>

      {/* Seccion 1: Variables Globales del Sistema (Google Maps, Radio GPS, Biometria) */}
      <Card className="border-indigo-200 bg-indigo-50/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 text-white rounded-lg">
              <Key className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-xl text-indigo-950">Integración & Variables del Sistema</CardTitle>
              <CardDescription>
                Configure la API Key de Google Maps y los parámetros operativos de geolocalización y biometría. Cada opción incluye su guía explicativa.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {loadingConfigs ? (
            <div className="flex items-center justify-center py-6 text-sm text-gray-500 gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-indigo-600" /> Cargando configuraciones...
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {/* Google Maps API Key */}
              <div className="p-4 bg-white border rounded-xl shadow-sm space-y-2 hover:border-indigo-300 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="text-sm font-bold text-gray-900 flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-indigo-600" /> GOOGLE_MAPS_API_KEY
                    </label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Llave de API de Google Maps Platform (Geocoding API & Maps JavaScript API). Requerida para ubicar clientes, sedes y visualización interactiva de mapas.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[110px]"
                    onClick={() => handleSaveConfigItem("GOOGLE_MAPS_API_KEY", "API Key de Google Maps para geocodificación, visualización de mapas y validación de ubicaciones.")}
                    disabled={savingKey === "GOOGLE_MAPS_API_KEY"}
                  >
                    {savingKey === "GOOGLE_MAPS_API_KEY" ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                    Guardar
                  </Button>
                </div>
                <Input
                  type="password"
                  value={localConfigs["GOOGLE_MAPS_API_KEY"] || ""}
                  onChange={(e) => setLocalConfigs({ ...localConfigs, GOOGLE_MAPS_API_KEY: e.target.value })}
                  placeholder="Ej: AIzaSyD..."
                  className="font-mono text-sm"
                />
                <p className="text-[11px] text-gray-500 italic">
                  * Si no posee una clave comercial, la plataforma utilizará automáticamente el motor libre OpenStreetMap (Nominatim) para geocodificación sin costo.
                </p>
              </div>

              {/* Radio Geocerca y Tolerancia Biometrica */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-white border rounded-xl shadow-sm space-y-2 col-span-full md:col-span-1">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-gray-900">Salario Mínimo Mensual (SMLMV)</label>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSaveConfigItem("MINIMUM_WAGE", "Salario Mínimo Mensual Legal Vigente en Colombia.")}
                      disabled={savingKey === "MINIMUM_WAGE"}
                    >
                      {savingKey === "MINIMUM_WAGE" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                      Guardar
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Valor en COP del Salario Mínimo Mensual Legal Vigente (ej: 1423500 para 2026).
                  </p>
                  <Input
                    type="number"
                    value={localConfigs["MINIMUM_WAGE"] || "1423500"}
                    onChange={(e) => setLocalConfigs({ ...localConfigs, MINIMUM_WAGE: e.target.value })}
                    placeholder="1423500"
                  />
                </div>

                <div className="p-4 bg-white border rounded-xl shadow-sm space-y-2 col-span-full md:col-span-1">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-gray-900">Auxilio de Transporte Mensual</label>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSaveConfigItem("TRANSPORTATION_ASSISTANCE", "Auxilio de Transporte legal mensual en Colombia.")}
                      disabled={savingKey === "TRANSPORTATION_ASSISTANCE"}
                    >
                      {savingKey === "TRANSPORTATION_ASSISTANCE" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                      Guardar
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Valor en COP del Auxilio de Transporte mensual legal (ej: 200000 para 2026).
                  </p>
                  <Input
                    type="number"
                    value={localConfigs["TRANSPORTATION_ASSISTANCE"] || "200000"}
                    onChange={(e) => setLocalConfigs({ ...localConfigs, TRANSPORTATION_ASSISTANCE: e.target.value })}
                    placeholder="200000"
                  />
                </div>

                <div className="p-4 bg-white border rounded-xl shadow-sm space-y-2 col-span-full md:col-span-1">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-gray-900 flex items-center gap-2">
                      <Camera className="h-4 w-4 text-indigo-600" /> Tolerancia Biométrica (Rostro)
                    </label>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSaveConfigItem("FACE_MATCH_THRESHOLD", "Porcentaje mínimo de coincidencia para reconocimiento facial.")}
                      disabled={savingKey === "FACE_MATCH_THRESHOLD"}
                    >
                      {savingKey === "FACE_MATCH_THRESHOLD" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                      Guardar
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Porcentaje de coincidencia (ej: 70 para 70%). Entre menor el porcentaje, menos estricto será el sistema.
                  </p>
                  <Input
                    type="number"
                    value={localConfigs["FACE_MATCH_THRESHOLD"] || "60"}
                    onChange={(e) => setLocalConfigs({ ...localConfigs, FACE_MATCH_THRESHOLD: e.target.value })}
                    placeholder="70"
                  />
                </div>

                <div className="p-4 bg-white border rounded-xl shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-gray-900">GEOFENCE_RADIUS_METERS</label>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSaveConfigItem("GEOFENCE_RADIUS_METERS", "Radio de margen permitido en metros para validación de geocerca en cliente.")}
                      disabled={savingKey === "GEOFENCE_RADIUS_METERS"}
                    >
                      {savingKey === "GEOFENCE_RADIUS_METERS" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                      Guardar
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Distancia máxima en metros a la sede del cliente para permitir el inicio de turno en la app móvil.
                  </p>
                  <Input
                    type="number"
                    value={localConfigs["GEOFENCE_RADIUS_METERS"] || "100"}
                    onChange={(e) => setLocalConfigs({ ...localConfigs, GEOFENCE_RADIUS_METERS: e.target.value })}
                    placeholder="100"
                  />
                </div>

                <div className="p-4 bg-white border rounded-xl shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-gray-900">FACE_RECOGNITION_TOLERANCE</label>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSaveConfigItem("FACE_RECOGNITION_TOLERANCE", "Tolerancia de similitud para verificación biométrica facial.")}
                      disabled={savingKey === "FACE_RECOGNITION_TOLERANCE"}
                    >
                      {savingKey === "FACE_RECOGNITION_TOLERANCE" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                      Guardar
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Umbral de tolerancia facial (ej. 0.60). Un menor valor exige mayor exactitud en el rostro del empleado.
                  </p>
                  <Input
                    type="text"
                    value={localConfigs["FACE_RECOGNITION_TOLERANCE"] || "0.60"}
                    onChange={(e) => setLocalConfigs({ ...localConfigs, FACE_RECOGNITION_TOLERANCE: e.target.value })}
                    placeholder="0.60"
                  />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Seccion 1.5: Tiempos y Tolerancias Operativas */}
      <Card className="border-amber-200 bg-amber-50/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-600 text-white rounded-lg">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-xl text-amber-950">Tiempos y Tolerancias Operativas</CardTitle>
              <CardDescription>
                Configure los tiempos límite y notificaciones para los turnos operativos. Asigne un valor de 0 para desactivar la función respectiva.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {loadingConfigs ? (
            <div className="flex items-center justify-center py-6 text-sm text-gray-500 gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-amber-600" /> Cargando configuraciones...
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-white border rounded-xl shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-gray-900">Tolerancia Turno Perdido</label>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSaveConfigItem("SHIFT_LOST_TOLERANCE_MINUTES", "Minutos de tolerancia antes de marcar un turno como perdido.")}
                    disabled={savingKey === "SHIFT_LOST_TOLERANCE_MINUTES"}
                  >
                    {savingKey === "SHIFT_LOST_TOLERANCE_MINUTES" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                    Guardar
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Minutos tras finalizar el turno antes de darlo por perdido (ej: 20).</p>
                <Input
                  type="number"
                  value={localConfigs["SHIFT_LOST_TOLERANCE_MINUTES"] || "20"}
                  onChange={(e) => setLocalConfigs({ ...localConfigs, SHIFT_LOST_TOLERANCE_MINUTES: e.target.value })}
                  placeholder="20"
                />
              </div>

              <div className="p-4 bg-white border rounded-xl shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-gray-900">Alerta Inicio de Turno</label>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSaveConfigItem("SHIFT_START_ALERT_MINUTES", "Minutos antes del turno para alertar al empleado.")}
                    disabled={savingKey === "SHIFT_START_ALERT_MINUTES"}
                  >
                    {savingKey === "SHIFT_START_ALERT_MINUTES" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                    Guardar
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Minutos antes para enviar la notificación de inicio (ej: 15, 0 = no avisar).</p>
                <Input
                  type="number"
                  value={localConfigs["SHIFT_START_ALERT_MINUTES"] || "15"}
                  onChange={(e) => setLocalConfigs({ ...localConfigs, SHIFT_START_ALERT_MINUTES: e.target.value })}
                  placeholder="15"
                />
              </div>

              <div className="p-4 bg-white border rounded-xl shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-gray-900">Alerta Fin de Turno</label>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSaveConfigItem("SHIFT_END_ALERT_MINUTES", "Minutos antes del fin de turno para alertar al empleado.")}
                    disabled={savingKey === "SHIFT_END_ALERT_MINUTES"}
                  >
                    {savingKey === "SHIFT_END_ALERT_MINUTES" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                    Guardar
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Minutos antes para enviar la notificación de finalización (ej: 15, 0 = no avisar).</p>
                <Input
                  type="number"
                  value={localConfigs["SHIFT_END_ALERT_MINUTES"] || "15"}
                  onChange={(e) => setLocalConfigs({ ...localConfigs, SHIFT_END_ALERT_MINUTES: e.target.value })}
                  placeholder="15"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Seccion 2: Tablas Maestras Colombia */}
      <Card className="border-blue-200 bg-blue-50/20">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl text-blue-900">
                <ListChecks className="h-6 w-6 text-blue-600" /> Tablas Maestras de Colombia (Departamentos, Ciudades, EPS, ARL, AFP)
              </CardTitle>
              <CardDescription>
                Administre los catálogos nacionales que se consultan en el formulario de empleados, clientes y nómina.
              </CardDescription>
            </div>
            <Button onClick={handleOpenAdd} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" /> Agregar a {activeTab.toUpperCase()}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Categorías Navigation */}
            <div className="flex gap-2 border-b border-border mb-4 overflow-x-auto pb-1">
              {[
                { id: "departments", label: "Departamentos" },
                { id: "cities", label: "Ciudades" },
                { id: "eps", label: "EPS (Salud)" },
                { id: "arl", label: "ARL (Riesgos)" },
                { id: "afp", label: "AFP (Pensiones)" },
                { id: "banks", label: "Bancos (Nómina)" },
              ].map((tab) => (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab(tab.id as CatalogCategory)}
              >
                {tab.label}
              </Button>
            ))}
          </div>

          {/* List display */}
          <div className="bg-white rounded-lg border p-4 max-h-[350px] overflow-y-auto">
            {loadingCatalog ? (
              <p className="text-center py-6 text-sm text-gray-500">Cargando catálogo...</p>
            ) : items.length === 0 ? (
              <p className="text-center py-6 text-sm text-gray-500">No hay elementos registrados en esta categoría.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg hover:border-blue-300 transition-colors">
                    <div>
                      <p className="font-semibold text-sm text-gray-900">{item.name}</p>
                      {item.department && <p className="text-xs text-blue-600">Dep: {item.department}</p>}
                      {item.code && <p className="text-[10px] text-gray-400 font-mono">Código: {item.code}</p>}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenEdit(item)}>
                        <Pencil className="h-3.5 w-3.5 text-blue-600" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteCatalog(item.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Seccion 3: Empresa y Seguridad */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5 text-blue-600" />Datos de la Empresa</CardTitle>
            <CardDescription>Información institucional visible en comprobantes de pago y reportes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">Razón Social</label>
              <Input
                value={localConfigs["COMPANY_NAME"] || "DLA Redes y Seguridad"}
                onChange={(e) => setLocalConfigs({ ...localConfigs, COMPANY_NAME: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">NIT</label>
              <Input
                value={localConfigs["COMPANY_NIT"] || "900.000.000-0"}
                onChange={(e) => setLocalConfigs({ ...localConfigs, COMPANY_NIT: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700">Email Corporativo</label>
                <Input
                  value={localConfigs["COMPANY_EMAIL"] || "info@dlaredes.com.co"}
                  onChange={(e) => setLocalConfigs({ ...localConfigs, COMPANY_EMAIL: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700">Teléfono</label>
                <Input
                  value={localConfigs["COMPANY_PHONE"] || "+57 300 000 0000"}
                  onChange={(e) => setLocalConfigs({ ...localConfigs, COMPANY_PHONE: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700">Dirección</label>
                <Input
                  value={localConfigs["COMPANY_ADDRESS"] || ""}
                  onChange={(e) => setLocalConfigs({ ...localConfigs, COMPANY_ADDRESS: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700">Departamento</label>
                <select
                  value={localConfigs["COMPANY_DEPARTMENT"] || ""}
                  onChange={(e) => setLocalConfigs({ ...localConfigs, COMPANY_DEPARTMENT: e.target.value, COMPANY_CITY: "" })}
                  className="w-full border p-2 rounded-md text-sm bg-background"
                >
                  <option value="">Seleccionar...</option>
                  {departments.map((d: any) => (
                    <option key={d.id || d.name || d} value={d.name || d}>{d.name || d}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700">Ciudad</label>
                <select
                  value={localConfigs["COMPANY_CITY"] || ""}
                  onChange={(e) => setLocalConfigs({ ...localConfigs, COMPANY_CITY: e.target.value })}
                  className="w-full border p-2 rounded-md text-sm bg-background"
                  disabled={!localConfigs["COMPANY_DEPARTMENT"]}
                >
                  <option value="">Seleccionar...</option>
                  {cities
                    .filter((c: any) => !localConfigs["COMPANY_DEPARTMENT"] || c.department_name === localConfigs["COMPANY_DEPARTMENT"] || c.department === localConfigs["COMPANY_DEPARTMENT"])
                    .map((c: any) => (
                      <option key={c.id || c.name || c} value={c.name || c}>{c.name || c}</option>
                    ))}
                </select>
              </div>
            </div>
            {/* Logo de la Empresa */}
            <div className="space-y-2 border p-3 rounded-xl bg-gray-50/50">
              <label className="text-xs font-bold text-gray-700 block">Logo Oficial de la Empresa</label>
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 rounded-xl border bg-white flex items-center justify-center overflow-hidden shadow-sm shrink-0">
                  {localConfigs["COMPANY_LOGO"] ? (
                    // eslint-disable-next-next/no-img-element
                    <img src={localConfigs["COMPANY_LOGO"]} alt="Logo Empresa" className="h-full w-full object-contain p-1" />
                  ) : (
                    <div className="text-[10px] font-bold text-blue-600">DLA Logo</div>
                  )}
                </div>
                <div className="space-y-1 flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    id="company-logo-upload"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setLocalConfigs({ ...localConfigs, COMPANY_LOGO: reader.result as string });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  <div className="flex gap-2">
                    <label
                      htmlFor="company-logo-upload"
                      className="cursor-pointer inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
                    >
                      <Upload className="h-3.5 w-3.5" /> Subir Logo
                    </label>
                    {localConfigs["COMPANY_LOGO"] && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-xs text-red-600 h-7 px-2"
                        onClick={() => setLocalConfigs({ ...localConfigs, COMPANY_LOGO: "" })}
                      >
                        Quitar
                      </Button>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    El logo cargado reemplaza la marca por defecto en el menú lateral, app móvil y desprendibles.
                  </p>
                </div>
              </div>
            </div>

            <Button
              className="bg-blue-600 hover:bg-blue-700 w-full"
              onClick={async () => {
                const snap = { ...localConfigs };
                await handleSaveConfigItem("COMPANY_NAME", "Nombre oficial de la empresa", snap["COMPANY_NAME"]);
                await handleSaveConfigItem("COMPANY_NIT", "NIT de la empresa", snap["COMPANY_NIT"]);
                await handleSaveConfigItem("COMPANY_EMAIL", "Email corporativo", snap["COMPANY_EMAIL"]);
                await handleSaveConfigItem("COMPANY_PHONE", "Teléfono corporativo", snap["COMPANY_PHONE"]);
                await handleSaveConfigItem("COMPANY_ADDRESS", "Dirección de la empresa", snap["COMPANY_ADDRESS"]);
                await handleSaveConfigItem("COMPANY_DEPARTMENT", "Departamento de la empresa", snap["COMPANY_DEPARTMENT"]);
                await handleSaveConfigItem("COMPANY_CITY", "Ciudad de la empresa", snap["COMPANY_CITY"]);
                await handleSaveConfigItem("COMPANY_LOGO", "Logo oficial de la empresa", snap["COMPANY_LOGO"]);
              }}
            >
              <Save className="h-4 w-4 mr-2" /> Guardar Datos de la Empresa
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5 text-emerald-600" />Seguridad & Cifrado</CardTitle>
            <CardDescription>Estado de los módulos de protección y autenticación activa</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
              <div>
                <p className="font-semibold text-sm">Autenticación JWT & Refresh</p>
                <p className="text-xs text-muted-foreground">Tokens rotativos con caducidad automática</p>
              </div>
              <Badge variant="success">Activo</Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
              <div>
                <p className="font-semibold text-sm">Encriptación de Fotos y Coordenadas</p>
                <p className="text-xs text-muted-foreground">AES-256-GCM y Hashes SHA-256</p>
              </div>
              <Badge variant="success">Activo</Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
              <div>
                <p className="font-semibold text-sm">Biometría Facial & Liveness Check</p>
                <p className="text-xs text-muted-foreground">Previene suplantación con fotos estáticas</p>
              </div>
              <Badge variant="success">Activo</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialog for Add/Edit Catalog Item */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? "Editar Elemento" : "Agregar Nuevo Elemento"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div>
              <label className="text-sm font-medium">Nombre / Razón Social *</label>
              <Input value={nameInput} onChange={(e) => setNameInput(e.target.value)} placeholder="Ej: EPS Sura / Medellín / Antioquia" />
            </div>
            {activeTab === "cities" && (
              <div>
                <label className="text-sm font-medium">Departamento *</label>
                <Input value={deptInput} onChange={(e) => setDeptInput(e.target.value)} placeholder="Ej: Antioquia" />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveCatalog} disabled={!nameInput.trim()}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
