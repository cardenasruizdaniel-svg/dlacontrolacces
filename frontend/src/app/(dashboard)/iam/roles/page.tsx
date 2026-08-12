"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Shield, Plus, Save, Loader2, Trash2, ChevronDown, ChevronRight, Check,
  Pencil, AlertCircle, CheckCircle2, Eye, Sparkles, CheckSquare, Square,
  LayoutDashboard, Users, FileText, DollarSign, Building2, Calendar, MapPin,
  Camera, BarChart3, Bot, Settings, BookOpen, ShieldCheck, Layers, RefreshCw
} from "lucide-react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useAuthStore } from "@/stores/authStore";

interface Role {
  id: string;
  name: string;
  display_name: string | null;
  description: string | null;
  is_active: boolean;
  is_system: boolean;
  level: number;
  color: string | null;
  icon: string | null;
  permission_count: number;
  user_count: number;
}

interface Perm {
  id: string;
  module: string;
  action: string;
  display_name: string | null;
  description?: string | null;
  is_active: boolean;
}

// Module Metadata dictionary for rich UI presentation
const MODULE_METADATA: Record<string, { label: string; icon: React.ElementType; color: string; desc: string }> = {
  dashboard: { label: "Panel de Control", icon: LayoutDashboard, color: "text-blue-500", desc: "Métricas generales y accesos rápidos" },
  employees: { label: "Gestión de Empleados", icon: Users, color: "text-indigo-500", desc: "Expedientes, datos laborales y fotos" },
  contracts: { label: "Contratos Laborales", icon: FileText, color: "text-emerald-500", desc: "Tipos de contrato, fechas y anexos" },
  payroll: { label: "Nómina y Liquidación", icon: DollarSign, color: "text-green-600", desc: "Cálculo de turnos, recargos y periodos" },
  clients: { label: "Clientes y Sedes", icon: Building2, color: "text-amber-500", desc: "Empresas clientes, sedes y puestos" },
  scheduling: { label: "Programación de Turnos", icon: Calendar, color: "text-purple-500", desc: "Cuadricula de turnos y asignaciones" },
  geolocation: { label: "Geolocalización GPS", icon: MapPin, color: "text-rose-500", desc: "Rastreo en mapa y geocercas" },
  access_control: { label: "Control de Acceso", icon: Shield, color: "text-cyan-500", desc: "Registros de entrada/salida y asistencia" },
  facial_recognition: { label: "Reconocimiento Facial", icon: Camera, color: "text-orange-500", desc: "Biometría y verificación de identidad" },
  roles: { label: "Matriz de Roles e IAM", icon: ShieldCheck, color: "text-red-500", desc: "Administración de roles y permisos" },
  reports: { label: "Reportes y Auditoría", icon: BarChart3, color: "text-sky-500", desc: "Informes exportables y logs del sistema" },
  ai_assistant: { label: "Asistente IA", icon: Bot, color: "text-violet-500", desc: "Consultas inteligentes y asistencia" },
  settings: { label: "Configuración del Sistema", icon: Settings, color: "text-slate-500", desc: "Parámetros globales y personalización" },
  help: { label: "Manual de Funcionamiento", icon: BookOpen, color: "text-teal-500", desc: "Guías de usuario y soporte" },
  users: { label: "Usuarios de Acceso", icon: Users, color: "text-indigo-600", desc: "Cuentas y credenciales de acceso" },
  branches: { label: "Sedes y Sucursales", icon: Building2, color: "text-amber-600", desc: "Ubicaciones físicas de la empresa" },
  cost_centers: { label: "Centros de Costo", icon: Layers, color: "text-yellow-600", desc: "Distribución contable y presupuestos" },
  departments: { label: "Departamentos / Áreas", icon: Building2, color: "text-blue-600", desc: "Estructura organizativa" },
  dotaciones: { label: "Dotaciones y Uniformes", icon: FileText, color: "text-lime-600", desc: "Entregas de equipamiento al personal" },
  notifications: { label: "Notificaciones y Alertas", icon: BellIconFallback, color: "text-amber-500", desc: "Avisos por email y sistema" },
};

function BellIconFallback(props: any) {
  return <Shield {...props} />;
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  view: { label: "Ver / Consultar", color: "bg-blue-50 text-blue-700 border-blue-200" },
  create: { label: "Crear / Registrar", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  update: { label: "Editar / Modificar", color: "bg-amber-50 text-amber-700 border-amber-200" },
  delete: { label: "Eliminar / Anular", color: "bg-red-50 text-red-700 border-red-200" },
  export: { label: "Exportar (Excel/PDF)", color: "bg-purple-50 text-purple-700 border-purple-200" },
  import: { label: "Importar Datos", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  approve: { label: "Aprobar Solicitudes", color: "bg-teal-50 text-teal-700 border-teal-200" },
  manage: { label: "Administración Total", color: "bg-rose-50 text-rose-700 border-rose-200" },
};

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [allPerms, setAllPerms] = useState<Perm[]>([]);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [newRole, setNewRole] = useState({ name: "", display_name: "", description: "", level: "50", color: "#2563EB" });
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const { loadUser } = useAuthStore();

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4500);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [rolesRes, permsRes] = await Promise.allSettled([
        api.get("/iam/roles"),
        api.get("/iam/permissions"),
      ]);

      if (rolesRes.status === "fulfilled" && rolesRes.value.data.items) {
        setRoles(rolesRes.value.data.items);
        if (!selectedRole && rolesRes.value.data.items.length > 0) {
          setSelectedRole(rolesRes.value.data.items[0].id);
        }
      }

      if (permsRes.status === "fulfilled" && permsRes.value.data.items) {
        setAllPerms(permsRes.value.data.items);
      }
    } catch (err) {
      console.error("Error cargando datos IAM:", err);
      showToast("error", "Error conectando con el servidor de roles");
    } finally {
      setLoading(false);
    }
  }, [selectedRole]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // When selected role changes, fetch its assigned permission IDs
  useEffect(() => {
    if (selectedRole) {
      api.get(`/iam/roles/${selectedRole}/permissions`)
        .then((res) => {
          setSelectedPerms(new Set(res.data.permission_ids || []));
        })
        .catch(() => {
          setSelectedPerms(new Set());
        });
    } else {
      setSelectedPerms(new Set());
    }
  }, [selectedRole]);

  const modules = useMemo(() => {
    return [...new Set(allPerms.map((p) => p.module))].sort();
  }, [allPerms]);

  const actions = useMemo(() => {
    return [...new Set(allPerms.map((p) => p.action))].sort();
  }, [allPerms]);

  const getPermId = (mod: string, act: string) => {
    const p = allPerms.find((x) => x.module === mod && x.action === act);
    return p?.id || null;
  };

  const togglePerm = (permId: string) => {
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      if (next.has(permId)) next.delete(permId);
      else next.add(permId);
      return next;
    });
  };

  const toggleModulePerms = (mod: string) => {
    const modPermIds = allPerms.filter((p) => p.module === mod).map((p) => p.id);
    const allSelected = modPermIds.every((id) => selectedPerms.has(id));
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      modPermIds.forEach((id) => {
        if (allSelected) next.delete(id);
        else next.add(id);
      });
      return next;
    });
  };

  const toggleExpand = (mod: string) => {
    setExpandedModules((prev) => {
      const n = new Set(prev);
      if (n.has(mod)) n.delete(mod);
      else n.add(mod);
      return n;
    });
  };

  // Quick Preset Actions
  const applyPresetAll = () => {
    const allIds = allPerms.map((p) => p.id);
    setSelectedPerms(new Set(allIds));
  };

  const applyPresetReadOnly = () => {
    const readOnlyIds = allPerms.filter((p) => p.action === "view").map((p) => p.id);
    setSelectedPerms(new Set(readOnlyIds));
  };

  const applyPresetOperational = () => {
    const opModules = ["scheduling", "access_control", "employees", "dashboard", "geolocation"];
    const opIds = allPerms.filter((p) => opModules.includes(p.module)).map((p) => p.id);
    setSelectedPerms(new Set(opIds));
  };

  const applyPresetClear = () => {
    setSelectedPerms(new Set());
  };

  const savePermissions = async () => {
    if (!selectedRole) return;
    setSaving(true);
    try {
      await api.put(`/iam/roles/${selectedRole}/permissions`, {
        permission_ids: Array.from(selectedPerms),
      });
      showToast("success", "Matriz de permisos actualizada correctamente");
      await loadUser(); // Refresh current user's active permissions
      await loadData();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Error al guardar permisos del rol";
      showToast("error", msg);
    } finally {
      setSaving(false);
    }
  };

  const createRole = async () => {
    if (!newRole.name.trim()) return;
    setSaving(true);
    try {
      const cleanName = newRole.name.trim().toLowerCase().replace(/\s+/g, "_");
      await api.post("/iam/roles", {
        name: cleanName,
        display_name: newRole.display_name.trim() || newRole.name.trim(),
        description: newRole.description.trim(),
        level: parseInt(newRole.level) || 50,
        color: newRole.color,
      });
      setCreateDialogOpen(false);
      setNewRole({ name: "", display_name: "", description: "", level: "50", color: "#2563EB" });
      showToast("success", `Rol "${newRole.display_name || newRole.name}" creado con éxito`);
      await loadData();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Error al crear el rol. Verifique que no exista un rol con el mismo nombre.";
      showToast("error", msg);
    } finally {
      setSaving(false);
    }
  };

  const updateRole = async () => {
    if (!editingRole) return;
    setSaving(true);
    try {
      await api.put(`/iam/roles/${editingRole.id}`, {
        display_name: editingRole.display_name,
        description: editingRole.description,
        level: editingRole.level,
        color: editingRole.color,
      });
      setEditDialogOpen(false);
      setEditingRole(null);
      showToast("success", "Rol actualizado correctamente");
      await loadData();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Error al actualizar los datos del rol";
      showToast("error", msg);
    } finally {
      setSaving(false);
    }
  };

  const deleteRole = async (roleId: string, roleName: string) => {
    if (!confirm(`¿Está seguro de eliminar el rol "${roleName}"? Esta acción no se puede deshacer.`)) return;
    try {
      await api.delete(`/iam/roles/${roleId}`);
      showToast("success", "Rol eliminado correctamente");
      if (selectedRole === roleId) setSelectedRole(null);
      await loadData();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "No se puede eliminar el rol porque tiene empleados o usuarios asignados.";
      showToast("error", msg);
    }
  };

  const selectedRoleData = roles.find((r) => r.id === selectedRole);

  // Active module access count for the selected role
  const activeModulesCount = useMemo(() => {
    return modules.filter((mod) => {
      const modPerms = allPerms.filter((p) => p.module === mod);
      return modPerms.some((p) => selectedPerms.has(p.id));
    }).length;
  }, [modules, allPerms, selectedPerms]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-3">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm font-semibold text-muted-foreground">Cargando matriz de roles y permisos...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl text-white text-sm font-semibold transition-all animate-in slide-in-from-top-4 duration-300 ${
            toast.type === "success" ? "bg-emerald-600 shadow-emerald-900/20" : "bg-rose-600 shadow-rose-900/20"
          }`}
        >
          {toast.type === "success" ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
          {toast.message}
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border p-6 rounded-2xl shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-primary/10 rounded-xl text-primary">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-foreground">Programación de Roles y Permisos (IAM)</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Configura a qué partes del programa puede entrar cada usuario y crea roles personalizados.
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => loadData()} className="rounded-xl">
            <RefreshCw className="h-4 w-4 mr-1.5" /> Recargar
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)} className="rounded-xl shadow-md font-bold">
            <Plus className="h-4 w-4 mr-1.5" /> Crear Nuevo Rol
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* LEFT COLUMN: ROLES LIST */}
        <div className="col-span-12 lg:col-span-4 space-y-4">
          <Card className="shadow-sm border-border">
            <CardHeader className="pb-3 border-b border-border/60">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" /> Roles del Sistema ({roles.length})
                </CardTitle>
                <Badge variant="secondary" className="text-xs font-semibold">
                  Nivel 1 - 100
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Selecciona un rol para ver y configurar sus accesos
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 space-y-2 max-h-[680px] overflow-y-auto">
              {roles.map((r) => {
                const isSelected = selectedRole === r.id;
                return (
                  <div
                    key={r.id}
                    className={`border rounded-xl p-3.5 cursor-pointer transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20"
                        : "hover:bg-muted/50 border-border/70"
                    }`}
                    onClick={() => setSelectedRole(r.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5">
                        <div
                          className="w-3.5 h-3.5 rounded-full mt-1 shrink-0 ring-2 ring-white shadow-sm"
                          style={{ backgroundColor: r.color || "#2563EB" }}
                        />
                        <div>
                          <p className="font-bold text-sm text-foreground leading-tight">
                            {r.display_name || r.name}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                            {r.description || "Sin descripción"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Badge variant="outline" className="text-[10px] font-bold px-1.5 py-0 h-5">
                          Niv. {r.level}
                        </Badge>
                        {!r.is_system && (
                          <div className="flex items-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-primary"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingRole({ ...r });
                                setEditDialogOpen(true);
                              }}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteRole(r.id, r.display_name || r.name);
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-border/50 text-[11px] text-muted-foreground">
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-foreground">
                          {r.permission_count || 0} permisos
                        </span>
                        <span>•</span>
                        <span>{r.user_count || 0} usuarios</span>
                      </div>
                      {r.is_system ? (
                        <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold py-0 h-4">
                          Sistema
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] font-medium py-0 h-4">
                          Personalizado
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: PERMISSION MATRIX BY MODULE */}
        <div className="col-span-12 lg:col-span-8 space-y-4">
          <Card className="shadow-sm border-border">
            <CardHeader className="pb-4 border-b border-border/60">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg font-bold">
                      {selectedRoleData ? `Permisos de: ${selectedRoleData.display_name || selectedRoleData.name}` : "Selecciona un rol"}
                    </CardTitle>
                    {selectedRoleData && (
                      <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs font-bold">
                        {activeModulesCount} de {modules.length} módulos activos
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="text-xs mt-1">
                    Activa o desactiva las secciones y acciones a las que este rol tendrá acceso dentro de DEAControl ERP
                  </CardDescription>
                </div>

                {selectedRole && (
                  <Button
                    onClick={savePermissions}
                    disabled={saving}
                    className="rounded-xl shadow-md font-bold shrink-0 bg-primary hover:bg-primary/90"
                  >
                    {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
                    Guardar Accesos
                  </Button>
                )}
              </div>

              {/* Quick Preset Buttons */}
              {selectedRole && (
                <div className="flex flex-wrap items-center gap-2 pt-3">
                  <span className="text-xs font-bold text-muted-foreground mr-1">Plantillas rápidas:</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={applyPresetAll}
                    className="h-7 text-xs rounded-lg border-border font-medium hover:bg-primary/10 hover:text-primary"
                  >
                    <Sparkles className="h-3 w-3 mr-1 text-amber-500" /> Acceso Total
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={applyPresetReadOnly}
                    className="h-7 text-xs rounded-lg border-border font-medium hover:bg-blue-50 hover:text-blue-600"
                  >
                    <Eye className="h-3 w-3 mr-1 text-blue-500" /> Solo Consulta (Lectura)
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={applyPresetOperational}
                    className="h-7 text-xs rounded-lg border-border font-medium hover:bg-emerald-50 hover:text-emerald-600"
                  >
                    <Calendar className="h-3 w-3 mr-1 text-emerald-500" /> Turnos y Asistencia
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={applyPresetClear}
                    className="h-7 text-xs rounded-lg font-medium text-muted-foreground hover:text-destructive"
                  >
                    Limpiar Todo
                  </Button>
                </div>
              )}
            </CardHeader>

            <CardContent className="p-4">
              {selectedRole ? (
                <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1">
                  {modules.map((mod) => {
                    const meta = MODULE_METADATA[mod] || {
                      label: mod.replace(/_/g, " "),
                      icon: Layers,
                      color: "text-primary",
                      desc: "Módulo del sistema",
                    };
                    const ModIcon = meta.icon;
                    const modPerms = allPerms.filter((p) => p.module === mod);
                    const selectedInMod = modPerms.filter((p) => selectedPerms.has(p.id));
                    const isFullySelected = modPerms.length > 0 && selectedInMod.length === modPerms.length;
                    const isPartiallySelected = selectedInMod.length > 0 && !isFullySelected;
                    const isExpanded = expandedModules.has(mod);

                    return (
                      <div
                        key={mod}
                        className={`border rounded-xl transition-all overflow-hidden ${
                          isFullySelected
                            ? "border-emerald-200 bg-emerald-500/[0.02]"
                            : isPartiallySelected
                            ? "border-blue-200 bg-blue-500/[0.02]"
                            : "border-border/70 hover:border-border"
                        }`}
                      >
                        {/* Module Header Bar */}
                        <div
                          className="flex items-center justify-between p-3.5 bg-card hover:bg-muted/40 cursor-pointer transition-colors"
                          onClick={() => toggleExpand(mod)}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg bg-muted/60 ${meta.color}`}>
                              <ModIcon className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-foreground">{meta.label}</span>
                                {isFullySelected ? (
                                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] font-bold py-0 h-4">
                                    Acceso Total ({selectedInMod.length}/{modPerms.length})
                                  </Badge>
                                ) : isPartiallySelected ? (
                                  <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[10px] font-bold py-0 h-4">
                                    Parcial ({selectedInMod.length}/{modPerms.length})
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-muted-foreground text-[10px] py-0 h-4">
                                    Sin Acceso
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">{meta.desc}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            {/* Toggle entire module button */}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleModulePerms(mod)}
                              className="h-8 px-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
                            >
                              {isFullySelected ? (
                                <>
                                  <CheckSquare className="h-4 w-4 mr-1 text-emerald-600" /> Desmarcar Módulo
                                </>
                              ) : (
                                <>
                                  <Square className="h-4 w-4 mr-1 text-primary" /> Marcar Módulo
                                </>
                              )}
                            </Button>

                            <button
                              type="button"
                              onClick={() => toggleExpand(mod)}
                              className="p-1 text-muted-foreground hover:text-foreground rounded-lg"
                            >
                              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>

                        {/* Individual Actions Checklist (when expanded) */}
                        {isExpanded && (
                          <div className="p-3 bg-muted/20 border-t border-border/60 grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {modPerms.map((p) => {
                              const isChecked = selectedPerms.has(p.id);
                              const actInfo = ACTION_LABELS[p.action] || {
                                label: p.display_name || p.action,
                                color: "bg-muted text-muted-foreground border-border",
                              };

                              return (
                                <div
                                  key={p.id}
                                  onClick={() => togglePerm(p.id)}
                                  className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-all ${
                                    isChecked
                                      ? "bg-card border-primary/40 shadow-xs ring-1 ring-primary/20"
                                      : "bg-card/60 border-border/60 hover:bg-card text-muted-foreground"
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <div
                                      className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                                        isChecked ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/40 bg-background"
                                      }`}
                                    >
                                      {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                                    </div>
                                    <span className={`text-xs font-medium ${isChecked ? "text-foreground font-semibold" : "text-muted-foreground"}`}>
                                      {p.display_name || actInfo.label}
                                    </span>
                                  </div>
                                  <Badge variant="outline" className={`text-[10px] font-bold px-1.5 py-0 h-4 border ${actInfo.color}`}>
                                    {p.action}
                                  </Badge>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-16 text-muted-foreground space-y-3">
                  <Shield className="h-12 w-12 mx-auto text-muted-foreground/40" />
                  <p className="font-semibold text-sm">Selecciona un rol en la lista izquierda para editar sus permisos</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* DIALOG: CREAR NUEVO ROL */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" /> Crear Nuevo Rol
            </DialogTitle>
            <DialogDescription className="text-xs">
              Define el nombre y las características del nuevo rol para los usuarios.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div>
              <label className="text-xs font-bold text-foreground">Nombre para Mostrar (Visible) *</label>
              <Input
                value={newRole.display_name}
                onChange={(e) => {
                  const val = e.target.value;
                  setNewRole((p) => ({
                    ...p,
                    display_name: val,
                    name: p.name || val.toLowerCase().replace(/\s+/g, "_"),
                  }));
                }}
                placeholder="Ej: Supervisor Zona Norte"
                className="mt-1 rounded-xl"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-foreground">Código Interno del Rol *</label>
              <Input
                value={newRole.name}
                onChange={(e) => setNewRole((p) => ({ ...p, name: e.target.value }))}
                placeholder="Ej: supervisor_norte"
                className="mt-1 rounded-xl font-mono text-xs"
              />
              <span className="text-[10px] text-muted-foreground">Identificador único en minúsculas sin espacios.</span>
            </div>

            <div>
              <label className="text-xs font-bold text-foreground">Descripción de Funciones</label>
              <Input
                value={newRole.description}
                onChange={(e) => setNewRole((p) => ({ ...p, description: e.target.value }))}
                placeholder="Ej: Encargado de coordinar y verificar turnos en campo"
                className="mt-1 rounded-xl text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-foreground">Nivel de Jerarquía (1 - 100)</label>
                <Input
                  type="number"
                  value={newRole.level}
                  onChange={(e) => setNewRole((p) => ({ ...p, level: e.target.value }))}
                  min="1"
                  max="100"
                  className="mt-1 rounded-xl"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-foreground">Color de Etiqueta</label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    type="color"
                    value={newRole.color}
                    onChange={(e) => setNewRole((p) => ({ ...p, color: e.target.value }))}
                    className="w-12 h-10 p-1 rounded-xl cursor-pointer"
                  />
                  <span className="text-xs font-mono">{newRole.color}</span>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)} className="rounded-xl">
              Cancelar
            </Button>
            <Button onClick={createRole} disabled={!newRole.name.trim() || saving} className="rounded-xl font-bold">
              {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : null} Guardar Rol
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: EDITAR ROL */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" /> Editar Datos del Rol
            </DialogTitle>
            <DialogDescription className="text-xs">
              Modifica la descripción, nivel o color del rol seleccionado.
            </DialogDescription>
          </DialogHeader>
          {editingRole && (
            <div className="space-y-4 py-3">
              <div>
                <label className="text-xs font-bold text-foreground">Código Interno</label>
                <Input value={editingRole.name} disabled className="mt-1 rounded-xl bg-muted font-mono text-xs" />
              </div>
              <div>
                <label className="text-xs font-bold text-foreground">Nombre para Mostrar *</label>
                <Input
                  value={editingRole.display_name || ""}
                  onChange={(e) => setEditingRole((p) => (p ? { ...p, display_name: e.target.value } : null))}
                  className="mt-1 rounded-xl"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-foreground">Descripción</label>
                <Input
                  value={editingRole.description || ""}
                  onChange={(e) => setEditingRole((p) => (p ? { ...p, description: e.target.value } : null))}
                  className="mt-1 rounded-xl text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-foreground">Nivel de Jerarquía</label>
                  <Input
                    type="number"
                    value={editingRole.level}
                    onChange={(e) => setEditingRole((p) => (p ? { ...p, level: parseInt(e.target.value) || 0 } : null))}
                    min="1"
                    max="100"
                    className="mt-1 rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-foreground">Color</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      type="color"
                      value={editingRole.color || "#2563EB"}
                      onChange={(e) => setEditingRole((p) => (p ? { ...p, color: e.target.value } : null))}
                      className="w-12 h-10 p-1 rounded-xl cursor-pointer"
                    />
                    <span className="text-xs font-mono">{editingRole.color}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setEditDialogOpen(false);
                setEditingRole(null);
              }}
              className="rounded-xl"
            >
              Cancelar
            </Button>
            <Button onClick={updateRole} disabled={saving} className="rounded-xl font-bold">
              {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : null} Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
