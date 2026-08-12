"use client";
import React, { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import {
  Plus, Search, Pencil, Trash2, Building2, MapPin, Navigation,
  Users, CheckCircle2, AlertCircle, Loader2, Power, GitBranch, Phone, Mail,
  ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight
} from "lucide-react";

// ─── Colombian departments/cities data ───────────────────────────────────────
const DEFAULT_DEPARTMENTS = [
  "Amazonas", "Antioquia", "Arauca", "Atlántico", "Bogotá D.C.", "Bolívar", "Boyacá", "Caldas",
  "Caquetá", "Casanare", "Cauca", "Cesar", "Chocó", "Córdoba", "Cundinamarca", "Guainía",
  "Guaviare", "Huila", "La Guajira", "Magdalena", "Meta", "Nariño", "Norte de Santander",
  "Putumayo", "Quindío", "Risaralda", "San Andrés y Providencia", "Santander", "Sucre",
  "Tolima", "Valle del Cauca", "Vaupés", "Vichada",
];

const emptyBranch = {
  name: "",
  code: "",
  parent_id: "",
  address: "",
  city: "Armenia",
  department: "Quindío",
  phone: "",
  email: "",
  latitude: "" as string | number,
  longitude: "" as string | number,
  geofence_radius: 100,
  is_main: false,
  is_sub_branch: false,
  is_active: true,
};

// ─── Geocoding via Nominatim ─────────────────────────────────────────────────
async function geocodeAddress(address: string, city: string, dept: string): Promise<{lat: number, lng: number} | null> {
  const q = encodeURIComponent(`${address}, ${city}, ${dept}, Colombia`);
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`);
    const data = await res.json();
    if (data && data[0]) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch {}
  return null;
}

// ─── BranchForm ──────────────────────────────────────────────────────────────
function BranchForm({
  data, onChange, branches, geocoding, onGeocode
}: {
  data: typeof emptyBranch;
  onChange: (d: any) => void;
  branches: any[];
  geocoding: boolean;
  onGeocode: () => void;
}) {
  const set = (k: string, v: any) => onChange({ ...data, [k]: v });

  const parentBranches = branches.filter(b => !b.is_sub_branch);

  return (
    <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
      {/* Tipo de Sede */}
      <div>
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Tipo de Sede</h4>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            className={`p-3 rounded-lg border-2 text-left transition-colors ${!data.parent_id ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40" : "border-slate-200 hover:border-slate-300"}`}
            onClick={() => onChange({ ...data, parent_id: "", is_sub_branch: false, is_main: false })}
          >
            <Building2 className="h-5 w-5 text-blue-600 mb-1" />
            <p className="text-sm font-semibold">Sede</p>
            <p className="text-xs text-muted-foreground">Ubicación principal de la empresa</p>
          </button>
          <button
            type="button"
            className={`p-3 rounded-lg border-2 text-left transition-colors ${data.parent_id ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40" : "border-slate-200 hover:border-slate-300"}`}
            onClick={() => onChange({ ...data, is_sub_branch: true, is_main: false })}
          >
            <GitBranch className="h-5 w-5 text-indigo-600 mb-1" />
            <p className="text-sm font-semibold">Subsede / Puesto</p>
            <p className="text-xs text-muted-foreground">Depende de una sede principal</p>
          </button>
        </div>
      </div>

      {/* Parent Sede (only for sub-branches) */}
      {data.is_sub_branch && (
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Sede Principal a la que pertenece <span className="text-red-500">*</span></label>
          <select
            className="flex h-9 w-full rounded-md border bg-background px-3 py-1.5 text-sm"
            value={data.parent_id || ""}
            onChange={(e) => set("parent_id", e.target.value)}
          >
            <option value="">Seleccione la sede principal...</option>
            {parentBranches.map((b) => (
              <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
            ))}
          </select>
        </div>
      )}

      {/* Información Básica */}
      <div>
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Información de la Sede</h4>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1">Nombre de la Sede <span className="text-red-500">*</span></label>
            <Input
              value={data.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Ej: Sede Centro, Subsede Norte, Puesto de Control..."
              className="h-9 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Código <span className="text-red-500">*</span></label>
            <Input
              value={data.code}
              onChange={(e) => set("code", e.target.value.toUpperCase())}
              placeholder="Ej: SEDE-001"
              className="h-9 text-sm font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Radio de Geocerca (metros)</label>
            <Input
              type="number"
              value={data.geofence_radius}
              onChange={(e) => set("geofence_radius", Number(e.target.value))}
              min={50} max={2000}
              className="h-9 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Ubicación */}
      <div>
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Ubicación Geográfica</h4>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Departamento</label>
            <select
              className="flex h-9 w-full rounded-md border bg-background px-3 py-1.5 text-sm"
              value={data.department}
              onChange={(e) => set("department", e.target.value)}
            >
              {DEFAULT_DEPARTMENTS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Ciudad / Municipio</label>
            <Input
              value={data.city}
              onChange={(e) => set("city", e.target.value)}
              placeholder="Armenia"
              className="h-9 text-sm"
            />
          </div>
        </div>
        <div className="mb-3">
          <label className="block text-xs font-medium text-gray-500 mb-1">Dirección Completa</label>
          <div className="flex gap-2">
            <Input
              value={data.address || ""}
              onChange={(e) => set("address", e.target.value)}
              placeholder="Ej: Cra. 14 # 23-00, Barrio Centro"
              className="h-9 text-sm flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 text-xs px-3 gap-1 shrink-0"
              disabled={geocoding || !data.address}
              onClick={onGeocode}
            >
              {geocoding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Navigation className="h-3.5 w-3.5 text-blue-600" />}
              Georreferenciar
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Latitud GPS</label>
            <Input
              type="number"
              step="0.000001"
              value={data.latitude || ""}
              onChange={(e) => set("latitude", e.target.value ? parseFloat(e.target.value) : "")}
              placeholder="Ej: 4.5389"
              className="h-9 text-sm font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Longitud GPS</label>
            <Input
              type="number"
              step="0.000001"
              value={data.longitude || ""}
              onChange={(e) => set("longitude", e.target.value ? parseFloat(e.target.value) : "")}
              placeholder="Ej: -75.6757"
              className="h-9 text-sm font-mono"
            />
          </div>
        </div>
        {data.latitude && data.longitude && (
          <div className="mt-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 rounded-lg p-2 text-xs text-emerald-700 flex items-center gap-2">
            <Navigation className="h-3.5 w-3.5 shrink-0" />
            Coordenadas verificadas · Radio de geocerca: {data.geofence_radius}m
          </div>
        )}
      </div>

      {/* Contacto */}
      <div>
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Contacto de la Sede</h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Teléfono / Celular</label>
            <Input
              value={data.phone || ""}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="+57 300 000 0000"
              className="h-9 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Email de Sede</label>
            <Input
              type="email"
              value={data.email || ""}
              onChange={(e) => set("email", e.target.value)}
              placeholder="sede@empresa.com"
              className="h-9 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Estado */}
      <div>
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Estado Operativo</h4>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 text-sm font-semibold transition-colors ${data.is_active ? "border-green-500 bg-green-50 text-green-700" : "border-slate-200 text-slate-500"}`}
            onClick={() => set("is_active", true)}
          >
            <CheckCircle2 className="h-4 w-4" /> Sede Activa
          </button>
          <button
            type="button"
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 text-sm font-semibold transition-colors ${!data.is_active ? "border-red-500 bg-red-50 text-red-700" : "border-slate-200 text-slate-500"}`}
            onClick={() => set("is_active", false)}
          >
            <Power className="h-4 w-4" /> Desactivada
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function BranchesPage() {
  const [branches, setBranches] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [filterActive, setFilterActive] = useState<string>("all");

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ ...emptyBranch });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [geocoding, setGeocoding] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const companyId = React.useMemo(() => {
    return (typeof window !== "undefined" ? localStorage.getItem("company_id") : null) || "dla-company-main";
  }, []);

  useEffect(() => {
    const h = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(h);
  }, [search]);

  const loadBranches = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {
        company_id: companyId,
        search: debouncedSearch.trim() || undefined,
      };
      if (filterActive !== "all") params.is_active = filterActive === "active";

      const res = await api.get("/branches", { params });
      const items = res.data.items || [];
      setBranches(items);
      setTotal(res.data.total || items.length);
    } catch {
      setBranches([]);
    }
    setLoading(false);
  }, [companyId, debouncedSearch, filterActive]);

  useEffect(() => {
    loadBranches();
  }, [loadBranches]);

  const handleGeocode = async () => {
    if (!formData.address) return;
    setGeocoding(true);
    const coords = await geocodeAddress(
      formData.address,
      formData.city,
      formData.department
    );
    if (coords) {
      setFormData((prev) => ({ ...prev, latitude: coords.lat, longitude: coords.lng }));
      showToast("success", `Coordenadas encontradas: ${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`);
    } else {
      showToast("error", "No se encontraron coordenadas para esta dirección. Intente ser más específico.");
    }
    setGeocoding(false);
  };

  const openCreate = () => {
    setEditMode(false);
    setEditId(null);
    setFormData({ ...emptyBranch });
    setError("");
    setDialogOpen(true);
  };

  const openEdit = async (branch: any) => {
    setEditMode(true);
    setEditId(branch.id);
    setError("");
    setFormData({
      name: branch.name || "",
      code: branch.code || "",
      parent_id: branch.parent_id || "",
      address: branch.address || "",
      city: branch.city || "Armenia",
      department: branch.department || "Quindío",
      phone: branch.phone || "",
      email: branch.email || "",
      latitude: branch.latitude ?? "",
      longitude: branch.longitude ?? "",
      geofence_radius: branch.geofence_radius || 100,
      is_main: branch.is_main || false,
      is_sub_branch: branch.is_sub_branch || !!branch.parent_id,
      is_active: branch.is_active !== false,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.code.trim()) {
      setError("El nombre y el código de la sede son obligatorios.");
      return;
    }
    if (formData.is_sub_branch && !formData.parent_id) {
      setError("Debe seleccionar la sede principal para esta subsede.");
      return;
    }

    setSaving(true);
    setError("");

    const payload = {
      ...formData,
      company_id: companyId,
      latitude: formData.latitude !== "" ? Number(formData.latitude) : null,
      longitude: formData.longitude !== "" ? Number(formData.longitude) : null,
      parent_id: formData.parent_id || null,
    };

    try {
      if (editMode && editId) {
        await api.put(`/branches/${editId}`, payload);
        showToast("success", `Sede "${formData.name}" actualizada correctamente.`);
      } else {
        await api.post("/branches", payload);
        showToast("success", `Sede "${formData.name}" creada correctamente. Ahora puede asignar empleados.`);
      }
      setDialogOpen(false);
      loadBranches();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Error al guardar la sede. Verifique los datos.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/branches/${deleteId}`);
      showToast("success", "Sede eliminada correctamente.");
      setDeleteId(null);
      loadBranches();
    } catch (err: any) {
      showToast("error", err?.response?.data?.detail || "No se puede eliminar esta sede.");
    }
  };

  const handleToggleStatus = async (branch: any) => {
    try {
      const newActive = !branch.is_active;
      await api.patch(`/branches/${branch.id}/status?is_active=${newActive}`);
      setBranches((prev) =>
        prev.map((b) => (b.id === branch.id ? { ...b, is_active: newActive } : b))
      );
      showToast("success", `Sede "${branch.name}" ${newActive ? "activada" : "desactivada"}.`);
    } catch (err: any) {
      showToast("error", err?.response?.data?.detail || "Error al cambiar estado.");
    }
  };

  // Pagination
  const paginatedBranches = branches.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.max(1, Math.ceil(branches.length / pageSize));

  const mainBranches = branches.filter(b => !b.is_sub_branch);
  const subBranches = branches.filter(b => b.is_sub_branch);
  const activeBranches = branches.filter(b => b.is_active).length;

  return (
    <div className="space-y-5">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-xl text-white text-sm font-semibold animate-in slide-in-from-bottom-4 ${
            toast.type === "success" ? "bg-emerald-600" : "bg-red-600"
          }`}
        >
          {toast.type === "success" ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <AlertCircle className="h-5 w-5 shrink-0" />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Building2 className="h-6 w-6 text-blue-600" />
            Gestión de Sedes y Subsedes
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Administre las ubicaciones operativas, puestos de control y geocercas de la empresa
          </p>
        </div>
        <Button onClick={openCreate} size="sm" className="gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          Nueva Sede / Subsede
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-blue-50 p-2 text-blue-600"><Building2 className="h-5 w-5" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Total Sedes</p>
              <p className="text-xl font-bold">{mainBranches.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600"><GitBranch className="h-5 w-5" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Subsedes/Puestos</p>
              <p className="text-xl font-bold">{subBranches.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-green-50 p-2 text-green-600"><CheckCircle2 className="h-5 w-5" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Activas</p>
              <p className="text-xl font-bold text-green-700">{activeBranches}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-purple-50 p-2 text-purple-600"><Users className="h-5 w-5" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Total Personal</p>
              <p className="text-xl font-bold">{branches.reduce((acc, b) => acc + (b.employees_count || 0), 0)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar sede por nombre, código, ciudad o dirección..."
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
        <div className="flex items-center gap-2">
          {["all", "active", "inactive"].map((f) => (
            <button
              key={f}
              className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                filterActive === f
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:border-primary/50"
              }`}
              onClick={() => setFilterActive(f)}
            >
              {f === "all" ? "Todas" : f === "active" ? "🟢 Activas" : "🔴 Inactivas"}
            </button>
          ))}
          {loading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
        </div>
      </div>

      {/* Branches Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-5"><div className="h-28 bg-muted rounded-lg" /></CardContent>
            </Card>
          ))
        ) : paginatedBranches.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="p-12 text-center text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-semibold">No se encontraron sedes</p>
              <p className="text-xs mt-1">Cree la primera sede de la empresa con el botón superior.</p>
            </CardContent>
          </Card>
        ) : (
          paginatedBranches.map((branch) => (
            <Card
              key={branch.id}
              className={`border transition-shadow hover:shadow-md ${
                !branch.is_active ? "opacity-60 border-slate-200 bg-slate-50/50" : branch.is_main ? "border-blue-200 bg-blue-50/20" : "border-slate-200"
              }`}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${branch.is_sub_branch ? "bg-indigo-100 text-indigo-600" : "bg-blue-100 text-blue-600"}`}>
                      {branch.is_sub_branch ? <GitBranch className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-foreground leading-tight">{branch.name}</p>
                      <p className="text-[11px] font-mono text-muted-foreground">{branch.code}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${branch.is_active ? "bg-green-50 text-green-700 border-green-200" : "bg-slate-100 text-slate-500 border-slate-200"}`}
                    >
                      {branch.is_active ? "🟢 Activa" : "🔴 Inactiva"}
                    </Badge>
                    {branch.is_sub_branch && (
                      <Badge variant="outline" className="text-[10px] bg-indigo-50 text-indigo-700 border-indigo-200">
                        Subsede
                      </Badge>
                    )}
                    {branch.is_main && (
                      <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                        ★ Principal
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-1.5 text-xs text-muted-foreground mb-3">
                  <p className="flex items-center gap-1.5">
                    <MapPin className="h-3 w-3 text-rose-500 shrink-0" />
                    {branch.address ? `${branch.address}, ` : ""}{branch.city} ({branch.department})
                  </p>
                  {branch.parent_name && (
                    <p className="flex items-center gap-1.5">
                      <GitBranch className="h-3 w-3 text-indigo-500 shrink-0" />
                      Depende de: <strong className="text-foreground">{branch.parent_name}</strong>
                    </p>
                  )}
                  {branch.phone && (
                    <p className="flex items-center gap-1.5">
                      <Phone className="h-3 w-3 text-slate-400 shrink-0" />
                      {branch.phone}
                    </p>
                  )}
                  {branch.latitude && branch.longitude ? (
                    <p className="flex items-center gap-1.5 text-emerald-600 font-medium">
                      <Navigation className="h-3 w-3 shrink-0" />
                      Geocerca: {branch.geofence_radius}m · GPS {parseFloat(branch.latitude).toFixed(4)}, {parseFloat(branch.longitude).toFixed(4)}
                    </p>
                  ) : (
                    <p className="flex items-center gap-1.5 text-amber-600">
                      <Navigation className="h-3 w-3 shrink-0" />
                      Sin coordenadas GPS — sin geocerca
                    </p>
                  )}
                </div>

                {/* Employee count */}
                <div className="flex items-center justify-between pt-2.5 border-t">
                  <span className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
                    <Users className="h-3.5 w-3.5 text-blue-500" />
                    {branch.employees_count || 0} empleado{branch.employees_count !== 1 ? "s" : ""} asignado{branch.employees_count !== 1 ? "s" : ""}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => handleToggleStatus(branch)}
                      title={branch.is_active ? "Desactivar sede" : "Activar sede"}
                    >
                      <Power className={`h-3.5 w-3.5 ${branch.is_active ? "text-green-600" : "text-slate-400"}`} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => openEdit(branch)}
                      title="Editar sede"
                    >
                      <Pencil className="h-3.5 w-3.5 text-blue-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => setDeleteId(branch.id)}
                      title="Eliminar sede"
                      disabled={branch.employees_count > 0}
                    >
                      <Trash2 className={`h-3.5 w-3.5 ${branch.employees_count > 0 ? "text-slate-200" : "text-red-500"}`} />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Pagination */}
      {branches.length > pageSize && (
        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
          <span>
            Mostrando {Math.min((page - 1) * pageSize + 1, branches.length)}–{Math.min(page * pageSize, branches.length)} de{" "}
            <strong>{branches.length}</strong> sedes
          </span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={page <= 1} onClick={() => setPage(1)}>
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="h-8 px-2 text-xs gap-1" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-4 w-4" /> Anterior
            </Button>
            <span className="px-2 font-semibold text-foreground">{page} / {totalPages}</span>
            <Button variant="outline" size="sm" className="h-8 px-2 text-xs gap-1" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Siguiente <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={page >= totalPages} onClick={() => setPage(totalPages)}>
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Dialog Crear/Editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-600" />
              {editMode ? "Editar Sede / Subsede" : "Nueva Sede / Subsede"}
            </DialogTitle>
          </DialogHeader>
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
          <BranchForm
            data={formData}
            onChange={setFormData}
            branches={branches}
            geocoding={geocoding}
            onGeocode={handleGeocode}
          />
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" size="sm">Cancelar</Button>
            </DialogClose>
            <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1">
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {saving ? "Guardando..." : editMode ? "Actualizar Sede" : "Crear Sede"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Eliminar */}
      <Dialog open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar Sede</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground space-y-2">
            <p>¿Está seguro que desea eliminar esta sede?</p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-700 text-xs">
              <strong>Nota:</strong> Solo se pueden eliminar sedes sin empleados asignados. Si tiene personal activo, primero reasígnelos a otra sede.
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" size="sm">Cancelar</Button></DialogClose>
            <Button variant="destructive" size="sm" onClick={handleDelete}>Eliminar Sede</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
