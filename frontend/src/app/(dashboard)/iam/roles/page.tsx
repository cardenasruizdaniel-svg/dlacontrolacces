"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Shield, Plus, Save, Loader2, Trash2, ChevronDown, ChevronRight, Check,
  Pencil, AlertCircle, CheckCircle2
} from "lucide-react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

interface Role {
  id: string; name: string; display_name: string | null; description: string | null;
  is_active: boolean; is_system: boolean; level: number; color: string | null;
  icon: string | null; permission_count: number; user_count: number;
}

interface Perm { id: string; module: string; action: string; display_name: string | null; is_active: boolean; }

// Roles predefinidos del sistema — se usan como fallback si la API no responde
const DEFAULT_ROLES: Role[] = [
  { id: "default-superadmin", name: "Super Admin", display_name: "Super Administrador", description: "Acceso total al sistema", is_active: true, is_system: true, level: 100, color: "#DC2626", icon: "shield", permission_count: 160, user_count: 1 },
  { id: "default-gerencia", name: "Gerencia", display_name: "Gerencia", description: "Acceso de lectura general + aprobaciones", is_active: true, is_system: true, level: 80, color: "#7C3AED", icon: "briefcase", permission_count: 11, user_count: 0 },
  { id: "default-administracion", name: "Administración", display_name: "Administración", description: "Gestión completa de operaciones administrativas", is_active: true, is_system: true, level: 70, color: "#2563EB", icon: "cog", permission_count: 38, user_count: 0 },
  { id: "default-supervisor", name: "Supervisor", display_name: "Supervisor", description: "Supervisión de operaciones y personal", is_active: true, is_system: true, level: 60, color: "#EA580C", icon: "eye", permission_count: 14, user_count: 0 },
  { id: "default-auditor", name: "Auditor", display_name: "Auditor", description: "Solo lectura + acceso a auditoría y reportes", is_active: true, is_system: true, level: 65, color: "#9333EA", icon: "search", permission_count: 13, user_count: 0 },
  { id: "default-administrativo", name: "Administrativo", display_name: "Administrativo", description: "Gestión de datos administrativos y turnos", is_active: true, is_system: true, level: 50, color: "#0891B2", icon: "clipboard", permission_count: 16, user_count: 0 },
  { id: "default-medico", name: "Médico", display_name: "Médico", description: "Acceso a información médica y pacientes", is_active: true, is_system: true, level: 45, color: "#059669", icon: "heart", permission_count: 5, user_count: 0 },
  { id: "default-enfermero", name: "Enfermero", display_name: "Enfermero", description: "Control de acceso y cuidado básico", is_active: true, is_system: true, level: 40, color: "#16A34A", icon: "activity", permission_count: 5, user_count: 0 },
  { id: "default-cuidador", name: "Cuidador", display_name: "Cuidador", description: "Acceso básico para cuidadores", is_active: true, is_system: true, level: 30, color: "#CA8A04", icon: "user", permission_count: 3, user_count: 0 },
];

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
  const [usingFallback, setUsingFallback] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [rolesRes, permsRes] = await Promise.allSettled([
        api.get("/iam/roles"),
        api.get("/iam/permissions"),
      ]);

      let rolesLoaded = false;
      if (rolesRes.status === "fulfilled" && rolesRes.value.data.items?.length > 0) {
        setRoles(rolesRes.value.data.items);
        rolesLoaded = true;
        setUsingFallback(false);
      }
      if (permsRes.status === "fulfilled") {
        setAllPerms(permsRes.value.data.items || []);
      }

      // Si no se cargaron roles desde la API, usar los predefinidos
      if (!rolesLoaded) {
        setRoles(DEFAULT_ROLES);
        setUsingFallback(true);
      }
    } catch (err) {
      console.error("Error cargando datos IAM:", err);
      setRoles(DEFAULT_ROLES);
      setUsingFallback(true);
    }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (selectedRole && !selectedRole.startsWith("default-")) {
      api.get(`/iam/roles/${selectedRole}/permissions`)
        .then(res => setSelectedPerms(new Set(res.data.permission_ids || [])))
        .catch(() => setSelectedPerms(new Set()));
    } else {
      setSelectedPerms(new Set());
    }
  }, [selectedRole]);

  const modules = [...new Set(allPerms.map(p => p.module))].sort();
  const actions = [...new Set(allPerms.map(p => p.action))].sort();

  const getPermId = (mod: string, act: string) => {
    const p = allPerms.find(x => x.module === mod && x.action === act);
    return p?.id || null;
  };

  const togglePerm = (permId: string) => {
    setSelectedPerms(prev => {
      const next = new Set(prev);
      if (next.has(permId)) next.delete(permId); else next.add(permId);
      return next;
    });
  };

  const toggleModulePerms = (mod: string) => {
    const modPermIds = actions.map(a => getPermId(mod, a)).filter(Boolean) as string[];
    const allSelected = modPermIds.every(id => selectedPerms.has(id));
    setSelectedPerms(prev => {
      const next = new Set(prev);
      modPermIds.forEach(id => { if (allSelected) next.delete(id); else next.add(id); });
      return next;
    });
  };

  const savePermissions = async () => {
    if (!selectedRole || selectedRole.startsWith("default-")) {
      showToast("error", "Los roles predefinidos no se pueden modificar en modo sin conexión");
      return;
    }
    setSaving(true);
    try {
      await api.put(`/iam/roles/${selectedRole}/permissions`, {
        permission_ids: Array.from(selectedPerms),
      });
      showToast("success", "Permisos guardados correctamente");
      await loadData();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Error al guardar permisos";
      showToast("error", msg);
    }
    finally { setSaving(false); }
  };

  const createRole = async () => {
    if (!newRole.name) return;
    setSaving(true);
    try {
      await api.post("/iam/roles", {
        name: newRole.name, display_name: newRole.display_name || newRole.name,
        description: newRole.description, level: parseInt(newRole.level), color: newRole.color,
      });
      setCreateDialogOpen(false);
      setNewRole({ name: "", display_name: "", description: "", level: "50", color: "#2563EB" });
      showToast("success", `Rol "${newRole.display_name || newRole.name}" creado correctamente`);
      await loadData();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Error al crear el rol. Verifique que tiene permisos de administrador.";
      showToast("error", msg);
    }
    finally { setSaving(false); }
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
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Error al actualizar el rol";
      showToast("error", msg);
    }
    finally { setSaving(false); }
  };

  const deleteRole = async (roleId: string) => {
    if (roleId.startsWith("default-")) {
      showToast("error", "Los roles del sistema no se pueden eliminar");
      return;
    }
    if (!confirm("¿Está seguro de eliminar este rol? Esta acción no se puede deshacer.")) return;
    try {
      await api.delete(`/iam/roles/${roleId}`);
      showToast("success", "Rol eliminado correctamente");
      if (selectedRole === roleId) setSelectedRole(null);
      await loadData();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Error al eliminar el rol. Puede tener usuarios asignados.";
      showToast("error", msg);
    }
  };

  const openEditDialog = (role: Role) => {
    if (role.id.startsWith("default-")) {
      showToast("error", "Los roles predefinidos no se pueden editar en modo sin conexión");
      return;
    }
    setEditingRole({ ...role });
    setEditDialogOpen(true);
  };

  const toggleExpand = (mod: string) => {
    setExpandedModules(prev => { const n = new Set(prev); if (n.has(mod)) n.delete(mod); else n.add(mod); return n; });
  };

  if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;

  const selectedRoleData = roles.find(r => r.id === selectedRole);

  return (
    <div className="p-6 space-y-6">
      {/* Toast de notificación */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-white text-sm transition-all animate-in slide-in-from-right ${toast.type === "success" ? "bg-green-600" : "bg-red-600"}`}>
          {toast.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {toast.message}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Roles y Permisos</h1>
          <p className="text-sm text-gray-500">Configuración de roles y matriz de permisos por módulo</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />Nuevo Rol
        </Button>
      </div>

      {usingFallback && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>Mostrando roles predefinidos del sistema. Los roles se sincronizan con el servidor cuando hay conexión.</span>
        </div>
      )}

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">Roles ({roles.length})</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {roles.map(r => (
                <div key={r.id}
                     className={`border rounded-lg p-3 cursor-pointer transition-all ${selectedRole === r.id ? "border-blue-500 bg-blue-50 shadow-sm" : "hover:bg-gray-50"}`}
                     onClick={() => setSelectedRole(r.id)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {r.color && <div className="w-3 h-3 rounded-full" style={{ backgroundColor: r.color }} />}
                      <div>
                        <p className="font-medium text-sm">{r.display_name || r.name}</p>
                        <p className="text-xs text-gray-500">{r.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="text-xs">Nivel {r.level}</Badge>
                      {!r.is_system && (
                        <>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={e => { e.stopPropagation(); openEditDialog(r); }}>
                            <Pencil className="h-3 w-3 text-blue-600" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={e => { e.stopPropagation(); deleteRole(r.id); }}>
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                    <span>{r.permission_count} permisos</span>
                    <span>{r.user_count} usuarios</span>
                    {r.is_system && <Badge className="bg-blue-100 text-blue-800 text-xs">Sistema</Badge>}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="col-span-12 lg:col-span-8">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">
                    {selectedRole ? `Permisos: ${selectedRoleData?.display_name || selectedRoleData?.name}` : "Seleccione un rol"}
                  </CardTitle>
                  <CardDescription>
                    {selectedRole
                      ? allPerms.length > 0
                        ? `${selectedPerms.size} de ${allPerms.length} permisos seleccionados`
                        : "Los permisos se cargarán cuando haya conexión con el servidor"
                      : "Haga clic en un rol para ver y editar sus permisos"}
                  </CardDescription>
                </div>
                {selectedRole && allPerms.length > 0 && (
                  <Button onClick={savePermissions} disabled={saving || selectedRole.startsWith("default-")}>
                    {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    Guardar
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {selectedRole && allPerms.length > 0 ? (
                <div className="space-y-1 max-h-[600px] overflow-y-auto">
                  {modules.map(mod => {
                    const expanded = expandedModules.has(mod);
                    const modPermIds = actions.map(a => getPermId(mod, a)).filter(Boolean) as string[];
                    const selectedCount = modPermIds.filter(id => selectedPerms.has(id)).length;
                    const allModSelected = modPermIds.length > 0 && selectedCount === modPermIds.length;
                    const someModSelected = selectedCount > 0 && !allModSelected;
                    return (
                      <div key={mod} className="border rounded-lg">
                        <div className="flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer" onClick={() => toggleExpand(mod)}>
                          <div className="flex items-center gap-2">
                            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            <span className="font-medium text-sm capitalize">{mod.replace(/_/g, " ")}</span>
                            {allModSelected ? <Badge className="bg-green-100 text-green-800 text-xs">Todos</Badge> :
                             someModSelected ? <Badge className="bg-yellow-100 text-yellow-800 text-xs">{selectedCount}/{modPermIds.length}</Badge> :
                             <span className="text-xs text-gray-400">Ninguno</span>}
                          </div>
                          <button className={`w-5 h-5 rounded border flex items-center justify-center ${allModSelected ? "bg-blue-500 border-blue-500" : someModSelected ? "bg-yellow-400 border-yellow-400" : "bg-white border-gray-300"}`}
                                  onClick={e => { e.stopPropagation(); toggleModulePerms(mod); }}>
                            {allModSelected && <Check className="h-3 w-3 text-white" />}
                            {someModSelected && <div className="w-2 h-2 bg-white rounded-sm" />}
                          </button>
                        </div>
                        {expanded && (
                          <div className="border-t p-3 space-y-1">
                            {actions.map(act => {
                              const pid = getPermId(mod, act);
                              const has = pid ? selectedPerms.has(pid) : false;
                              return (
                                <div key={act} className="flex items-center justify-between py-1 px-2 hover:bg-gray-50 rounded">
                                  <span className="text-sm capitalize">{act}</span>
                                  <button className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${has ? "bg-green-500 border-green-500" : "bg-white border-gray-300 hover:border-gray-400"}`}
                                          onClick={() => pid && togglePerm(pid)}>
                                    {has && <Check className="h-3 w-3 text-white" />}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : selectedRole ? (
                <div className="text-center py-12 text-gray-500">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 text-amber-400" />
                  <p className="font-medium">Permisos no disponibles</p>
                  <p className="text-sm mt-1">Los permisos se mostrarán cuando el servidor esté disponible.</p>
                  <p className="text-sm mt-1">Los roles predefinidos ya incluyen los permisos configurados por el sistema.</p>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Shield className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Seleccione un rol para ver y editar sus permisos</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Diálogo Crear Rol */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nuevo Rol</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div><label className="text-sm font-medium">Nombre interno *</label>
              <Input value={newRole.name} onChange={e => setNewRole(p => ({ ...p, name: e.target.value }))} placeholder="Ej: coordinador" /></div>
            <div><label className="text-sm font-medium">Nombre para mostrar</label>
              <Input value={newRole.display_name} onChange={e => setNewRole(p => ({ ...p, display_name: e.target.value }))} placeholder="Ej: Coordinador General" /></div>
            <div><label className="text-sm font-medium">Descripción</label>
              <Input value={newRole.description} onChange={e => setNewRole(p => ({ ...p, description: e.target.value }))} placeholder="Ej: Coordina operaciones en campo" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm font-medium">Nivel (1-100)</label>
                <Input type="number" value={newRole.level} onChange={e => setNewRole(p => ({ ...p, level: e.target.value }))} min="1" max="100" /></div>
              <div><label className="text-sm font-medium">Color</label>
                <Input type="color" value={newRole.color} onChange={e => setNewRole(p => ({ ...p, color: e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancelar</Button>
            <Button onClick={createRole} disabled={!newRole.name || saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}Crear Rol
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo Editar Rol */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Rol</DialogTitle></DialogHeader>
          {editingRole && (
            <div className="space-y-4 py-4">
              <div><label className="text-sm font-medium">Nombre interno</label>
                <Input value={editingRole.name} disabled className="bg-gray-50" /></div>
              <div><label className="text-sm font-medium">Nombre para mostrar</label>
                <Input value={editingRole.display_name || ""} onChange={e => setEditingRole(p => p ? { ...p, display_name: e.target.value } : null)} /></div>
              <div><label className="text-sm font-medium">Descripción</label>
                <Input value={editingRole.description || ""} onChange={e => setEditingRole(p => p ? { ...p, description: e.target.value } : null)} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-medium">Nivel (1-100)</label>
                  <Input type="number" value={editingRole.level} onChange={e => setEditingRole(p => p ? { ...p, level: parseInt(e.target.value) || 0 } : null)} min="1" max="100" /></div>
                <div><label className="text-sm font-medium">Color</label>
                  <Input type="color" value={editingRole.color || "#2563EB"} onChange={e => setEditingRole(p => p ? { ...p, color: e.target.value } : null)} /></div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditDialogOpen(false); setEditingRole(null); }}>Cancelar</Button>
            <Button onClick={updateRole} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
