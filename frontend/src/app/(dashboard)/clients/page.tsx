"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, MapPin, Navigation, Loader2, CheckCircle2, AlertCircle, Eye, Globe, Download, Upload, FileText } from "lucide-react";

// Official datasets for Colombia Departments & Municipalities
const DEFAULT_DEPARTMENTS = [
  "Amazonas", "Antioquia", "Arauca", "Atlántico", "Bogotá D.C.", "Bolívar", "Boyacá", "Caldas",
  "Caquetá", "Casanare", "Cauca", "Cesar", "Chocó", "Córdoba", "Cundinamarca", "Guainía",
  "Guaviare", "Huila", "La Guajira", "Magdalena", "Meta", "Nariño", "Norte de Santander",
  "Putumayo", "Quindío", "Risaralda", "San Andrés y Providencia", "Santander", "Sucre",
  "Tolima", "Valle del Cauca", "Vaupés", "Vichada"
];

const COLOMBIAN_CITIES_BY_DEPT: Record<string, string[]> = {
  "Amazonas": ["Leticia", "Puerto Nariño"],
  "Antioquia": ["Medellín", "Apartadó", "Bello", "Caldas", "Caucasia", "Envigado", "Itagüí", "Rionegro", "Sabaneta", "Turbo"],
  "Arauca": ["Arauca", "Arauquita", "Saravena", "Tame"],
  "Atlántico": ["Barranquilla", "Baranoa", "Malambo", "Puerto Colombia", "Sabanalarga", "Soledad"],
  "Bogotá D.C.": ["Bogotá D.C."],
  "Bolívar": ["Cartagena de Indias", "Arjona", "El Carmen de Bolívar", "Magangué", "Mompós", "Turbaco"],
  "Boyacá": ["Tunja", "Chiquinquirá", "Duitama", "Paipa", "Puerto Boyacá", "Sogamoso", "Villa de Leyva"],
  "Caldas": ["Manizales", "Anserma", "Chinchiná", "La Dorada", "Riosucio", "Villamaría"],
  "Caquetá": ["Florencia", "San Vicente del Caguán"],
  "Casanare": ["Yopal", "Aguazul", "Paz de Ariporo", "Tauramena"],
  "Cauca": ["Popayán", "Caloto", "Puerto Tejada", "Santander de Quilichao"],
  "Cesar": ["Valledupar", "Aguachica", "Agustín Codazzi", "Bosconia", "La Jagua de Ibirico"],
  "Chocó": ["Quibdó", "Istmina", "Nuquí", "Riosucio"],
  "Córdoba": ["Montería", "Cereté", "Lorica", "Montelíbano", "Planeta Rica", "Sahagún", "Tierralta"],
  "Cundinamarca": ["Soacha", "Chía", "Zipaquirá", "Fusagasugá", "Facatativá", "Mosquera", "Madrid", "Funza", "Cajicá", "Girardot"],
  "Huila": ["Neiva", "Garzón", "La Plata", "Pitalito"],
  "La Guajira": ["Riohacha", "Fonseca", "Maicao", "San Juan del Cesar", "Uribia"],
  "Magdalena": ["Santa Marta", "Ciénaga", "El Banco", "Fundación", "Plato"],
  "Meta": ["Villavicencio", "Acacías", "Granada", "Puerto Gaitán", "Puerto López"],
  "Nariño": ["Pasto", "Ipiales", "San Andrés de Tumaco", "Túquerres"],
  "Norte de Santander": ["Cúcuta", "Los Patios", "Ocaña", "Pamplona", "Tibú", "Villa del Rosario"],
  "Putumayo": ["Mocoa", "Orito", "Puerto Asís", "Villagarzón"],
  "Quindío": ["Armenia", "Buenavista", "Calarcá", "Circasia", "Córdoba", "Filandia", "Génova", "La Tebaida", "Montenegro", "Pijao", "Quimbaya", "Salento"],
  "Risaralda": ["Pereira", "Dosquebradas", "La Virginia", "Santa Rosa de Cabal"],
  "San Andrés y Providencia": ["San Andrés", "Providencia"],
  "Santander": ["Bucaramanga", "Floridablanca", "Girón", "Piedecuesta", "Barrancabermeja", "San Gil", "Socorro"],
  "Sucre": ["Sincelejo", "Corozal", "Coveñas", "San Marcos", "Tolú"],
  "Tolima": ["Ibagué", "Chaparral", "Espinal", "Flandes", "Honda", "Melgar"],
  "Valle del Cauca": ["Cali", "Buenaventura", "Guadalajara de Buga", "Cartago", "Jamundí", "Palmira", "Tuluá", "Yumbo"],
  "Vaupés": ["Mitú"],
  "Vichada": ["Puerto Carreño", "Cumaribo"]
};

const typeLabels: Record<string, string> = {
  enterprise: "Empresa", individual: "Persona Natural", ips: "IPS", hospital: "Hospital", clinic: "Clínica", project: "Proyecto",
};

const defaultForm = {
  company_id: "",
  client_type: "enterprise",
  name: "",
  nit: "",
  trade_name: "",
  email: "",
  phone: "",
  mobile: "",
  address: "",
  department: "Quindío",
  city: "Armenia",
  country: "CO",
  latitude: "",
  longitude: "",
  geofence_radius: "100",
  notes: "",
};

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingClient, setEditingClient] = useState<any | null>(null);
  const [form, setForm] = useState<any>({ ...defaultForm });
  const [saving, setSaving] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Bulk Import State for Clients
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importRows, setImportRows] = useState<any[]>([]);
  const [importFileName, setImportFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const companyId = typeof window !== "undefined" ? localStorage.getItem("company_id") || "dla-company-main" : "dla-company-main";

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFileName(file.name);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const lines = text.split(/\r\n|\n/).filter((l) => l.trim().length > 0);
      if (lines.length < 2) {
        showToast("error", "El archivo CSV debe contener al menos la fila de encabezados y una fila de datos");
        return;
      }
      const headers = lines[0].split(",").map((h) => h.trim().replace(/^["']|["']$/g, ""));
      const parsed: any[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map((c) => c.trim().replace(/^["']|["']$/g, ""));
        if (cols.length < 1) continue;
        const obj: any = {};
        for (let j = 0; j < headers.length; j++) {
          obj[headers[j]] = cols[j] || "";
        }
        parsed.push(obj);
      }
      setImportRows(parsed);
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = async () => {
    if (importRows.length === 0) return;
    setImporting(true);
    try {
      const res = await api.post("/clients/import", {
        company_id: companyId,
        clients: importRows,
      });
      setImportResult(res.data);
      showToast("success", `Importación completada: ${res.data.created_count} clientes/sedes creados.`);
      loadClients();
    } catch (err: any) {
      showToast("error", err?.response?.data?.detail || "Error en la importación masiva de clientes");
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadClientsTemplate = () => {
    if (typeof window !== "undefined") {
      window.open("/api/v1/clients/template", "_blank");
    }
  };

  const loadClients = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/clients`, { params: { company_id: companyId, search, page_size: 100 } });
      setClients(res.data.items || []);
      setTotal(res.data.total || 0);
    } catch {
      setClients([]);
    }
    setLoading(false);
  }, [companyId, search]);

  useEffect(() => { loadClients(); }, [loadClients]);

  // Geocode address to Latitude & Longitude automatically using OpenStreetMap Nominatim with fallback search
  const handleGeocodeAddress = async () => {
    if (!form.address || !form.address.trim()) {
      showToast("error", "Ingrese primero la dirección para calcular la georreferencia");
      return;
    }
    setGeocoding(true);

    // Normalize Colombian address shorthand
    let normalized = form.address
      .replace(/\bCra\.?\b/gi, "Carrera")
      .replace(/\bCl\.?\b|\bCll\.?\b/gi, "Calle")
      .replace(/\bDiag\.?\b/gi, "Diagonal")
      .replace(/\bAv\.?\b/gi, "Avenida")
      .replace(/\bTrans\.?\b|\bTr\.?\b/gi, "Transversal")
      .replace(/#/g, "No. ")
      .trim();

    const city = form.city || "Armenia";
    const dept = form.department || "Quindío";

    const searchQueries = [
      `${normalized}, ${city}, ${dept}, Colombia`,
      `${normalized}, ${city}, Colombia`,
      `${city}, ${dept}, Colombia`,
    ];

    let found = false;
    for (const q of searchQueries) {
      try {
        const query = encodeURIComponent(q);
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`);
        const data = await response.json();

        if (data && data.length > 0) {
          const lat = parseFloat(data[0].lat).toFixed(6);
          const lon = parseFloat(data[0].lon).toFixed(6);
          setForm((prev: any) => ({
            ...prev,
            latitude: lat,
            longitude: lon,
          }));
          showToast("success", `Georreferencia calculada: Lat ${lat}, Lon ${lon}`);
          found = true;
          break;
        }
      } catch {}
    }

    if (!found) {
      showToast("error", "No se encontraron coordenadas para esa dirección. Ingrese latitud y longitud manualmente.");
    }
    setGeocoding(false);
  };

  const captureGPSLocation = () => {
    if (!navigator.geolocation) {
      showToast("error", "Geolocalización no soportada por el navegador");
      return;
    }
    setGeocoding(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((prev: any) => ({
          ...prev,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
        }));
        showToast("success", "Ubicación GPS capturada correctamente");
        setGeocoding(false);
      },
      (err) => {
        showToast("error", "Error al obtener GPS: " + err.message);
        setGeocoding(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleOpenEdit = (client: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingClient(client);
    setForm({
      name: client.name || "",
      trade_name: client.trade_name || "",
      client_type: client.client_type || "enterprise",
      nit: client.nit || "",
      email: client.email || "",
      phone: client.phone || "",
      mobile: client.mobile || "",
      address: client.address || "",
      department: client.department || "Quindío",
      city: client.city || "Armenia",
      country: client.country || "CO",
      latitude: client.latitude != null ? String(client.latitude) : "",
      longitude: client.longitude != null ? String(client.longitude) : "",
      geofence_radius: String(client.geofence_radius || 100),
      notes: client.notes || "",
    });
    setShowCreate(true);
  };

  const handleDeleteClient = async (client: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`¿Está seguro de eliminar el cliente o sede "${client.name}"?`)) return;
    try {
      await api.delete(`/clients/${client.id}`);
      showToast("success", `Cliente "${client.name}" eliminado correctamente`);
      loadClients();
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      const errMsg = typeof detail === "string" ? detail : "No fue posible eliminar el cliente.";
      showToast("error", errMsg);
    }
  };

  const handleSaveClient = async () => {
    if (!form.name || !form.name.trim()) {
      showToast("error", "El nombre del cliente o sede es obligatorio");
      return;
    }
    setSaving(true);
    try {
      const parseNum = (val: any) => {
        if (val === null || val === undefined || val === "") return null;
        const n = parseFloat(val);
        return isNaN(n) ? null : n;
      };

      const payload: any = {
        ...form,
        company_id: companyId || "dla-company-main",
        latitude: parseNum(form.latitude),
        longitude: parseNum(form.longitude),
        geofence_radius: parseNum(form.geofence_radius) || 100,
      };

      if (editingClient) {
        const res = await api.put(`/clients/${editingClient.id}`, payload);
        showToast("success", `Cliente "${form.name}" actualizado correctamente`);
        // Optimistic update: immediately reflect in list
        setClients((prev) => prev.map((c) => (c.id === editingClient.id ? { ...c, ...res.data } : c)));
      } else {
        const res = await api.post("/clients", payload);
        showToast("success", `Cliente "${form.name}" creado correctamente`);
        // Optimistic insert at top immediately
        if (res.data && res.data.id) {
          setClients((prev) => [res.data, ...prev.filter((c) => c.id !== res.data.id)]);
          setTotal((prev) => prev + 1);
        }
      }

      // Close modal immediately so user sees the list update
      setShowCreate(false);
      setEditingClient(null);
      setForm({ ...defaultForm });

      // Reload from server in background (non-blocking)
      loadClients();
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      const errMsg = typeof detail === "string" ? detail : Array.isArray(detail) ? detail.map((d: any) => d.msg || JSON.stringify(d)).join(", ") : "Error al guardar cliente. Verifique los datos.";
      showToast("error", errMsg);
    }
    setSaving(false);
  };

  // Available cities based on selected department
  const selectedDept = form.department || "Quindío";
  const availableCities = COLOMBIAN_CITIES_BY_DEPT[selectedDept] || ["Armenia"];

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-white text-sm max-w-md ${toast.type === "success" ? "bg-green-600" : "bg-red-600"}`}>
          {toast.type === "success" ? <CheckCircle2 className="h-4 w-4 flex-shrink-0" /> : <AlertCircle className="h-4 w-4 flex-shrink-0" />}
          {toast.message}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestión de Clientes y Sedes</h1>
          <p className="text-xs text-muted-foreground">Administración centralizada de sedes, contratos y georreferenciación ({total} registros)</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" onClick={handleDownloadClientsTemplate} className="gap-1.5 text-xs font-semibold">
            <Download className="h-4 w-4 text-blue-600" /> Plantilla CSV
          </Button>
          <Button variant="outline" onClick={() => { setImportModalOpen(true); setImportRows([]); setImportResult(null); setImportFileName(""); }} className="gap-1.5 text-xs font-semibold">
            <Upload className="h-4 w-4 text-cyan-600" /> Carga Masiva
          </Button>
          <Button onClick={() => { setEditingClient(null); setForm({ ...defaultForm, company_id: companyId }); setShowCreate(true); }} className="gap-1 text-xs font-bold">
            <Plus className="h-4 w-4" /> Nuevo Cliente
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nombre, NIT, ciudad..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse"><CardContent className="p-6"><div className="h-24 bg-muted rounded" /></CardContent></Card>
          ))
        ) : clients.length === 0 ? (
          <Card className="col-span-full"><CardContent className="p-12 text-center text-muted-foreground">No se encontraron clientes registrados</CardContent></Card>
        ) : (
          clients.map((client) => (
            <Card key={client.id} className="hover:shadow-md transition-shadow cursor-pointer border border-slate-200" onClick={() => router.push(`/clients/${client.id}`)}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-slate-900">{client.name}</h3>
                    <p className="text-xs text-slate-500 font-mono">{client.nit ? `NIT: ${client.nit}` : "Sin NIT"}</p>
                    <p className="text-xs text-slate-600 flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3 text-red-500" />
                      {client.city || "Armenia"} ({client.department || "Quindío"})
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                    {typeLabels[client.client_type] || client.client_type}
                  </Badge>
                </div>

                <div className="mt-3 pt-3 border-t flex items-center justify-between text-xs gap-1">
                  {client.latitude && client.longitude ? (
                    <span className="text-green-600 font-medium flex items-center gap-1 truncate text-[11px]">
                      <Navigation className="h-3 w-3 shrink-0" />Georreferenciado ({client.geofence_radius || 100}m)
                    </span>
                  ) : (
                    <span className="text-amber-600 font-normal text-[11px]">Sin Georreferencia</span>
                  )}
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="outline" size="sm" className="h-7 px-2 text-[11px] font-semibold text-blue-700 border-blue-200 hover:bg-blue-50" onClick={(e) => handleOpenEdit(client, e)}>
                      ✏️ Editar
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 px-2 text-[11px] font-semibold text-rose-700 border-rose-200 hover:bg-rose-50" onClick={(e) => handleDeleteClient(client, e)}>
                      🗑️ Eliminar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Modal Nuevo Cliente */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingClient ? `Editar Cliente / Sede (${editingClient.name})` : "Nuevo Cliente (Georreferenciación & Catálogos Colombia)"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Datos Principales */}
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Datos Principales</h4>
              <div className="grid grid-cols-2 gap-3 mb-2">
                <div>
                  <label className="text-xs font-medium text-gray-700">Nombre / Razón Social *</label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej: Clínica Central del Quindío" className="h-9 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700">Nombre Comercial</label>
                  <Input value={form.trade_name} onChange={(e) => setForm({ ...form, trade_name: e.target.value })} placeholder="Ej: Sede Norte" className="h-9 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-700">NIT / Identificación</label>
                  <Input value={form.nit} onChange={(e) => setForm({ ...form, nit: e.target.value })} placeholder="Ej: 900123456-7" className="h-9 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700">Tipo de Cliente</label>
                  <select
                    className="flex h-9 w-full rounded-md border bg-background px-3 py-1.5 text-sm"
                    value={form.client_type}
                    onChange={(e) => setForm({ ...form, client_type: e.target.value })}
                  >
                    {Object.entries(typeLabels).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Contacto & Ubicación Catálogos */}
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Contacto & Ubicación Catálogo Colombia</h4>
              <div className="grid grid-cols-2 gap-3 mb-2">
                <div>
                  <label className="text-xs font-medium text-gray-700">Email de Contacto</label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="contacto@cliente.com" className="h-9 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700">Teléfono / Celular</label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+57 606 7400000" className="h-9 text-sm" />
                </div>
              </div>

              <div className="mb-2">
                <label className="text-xs font-semibold text-gray-800 flex items-center justify-between">
                  <span>Dirección del Cliente / Sede *</span>
                </label>
                <Input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Ej: Carrera 14 # 23-45 o Calle 19 # 14-22"
                  className="h-9 text-sm border-blue-200 focus:border-blue-500"
                />
                <p className="text-[11px] text-blue-700 bg-blue-50/80 p-1.5 rounded mt-1 border border-blue-100 flex items-center gap-1">
                  💡 <strong>Ejemplo de formato:</strong> <em>Carrera 14 # 23-45</em> o <em>Calle 19 # 14-22</em>. Al presionar "Geocodificar por Dirección", se calculará la ubicación GPS combinándola con la Ciudad y Departamento seleccionados.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-700">Departamento</label>
                  <select
                    className="flex h-9 w-full rounded-md border bg-background px-3 py-1.5 text-sm"
                    value={form.department || "Quindío"}
                    onChange={(e) => {
                      const newDept = e.target.value;
                      const firstCity = COLOMBIAN_CITIES_BY_DEPT[newDept]?.[0] || "";
                      setForm({ ...form, department: newDept, city: firstCity });
                    }}
                  >
                    {DEFAULT_DEPARTMENTS.map((dep) => (
                      <option key={dep} value={dep}>{dep}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700">Ciudad / Municipio</label>
                  <select
                    className="flex h-9 w-full rounded-md border bg-background px-3 py-1.5 text-sm"
                    value={form.city || "Armenia"}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                  >
                    {availableCities.map((city) => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Georreferenciación & Geocerca para App Móvil */}
            <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1">
                  <Navigation className="h-4 w-4 text-blue-600" /> Georreferenciación & Geocerca de Visitas (App Móvil)
                </h4>
              </div>

              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" className="h-8 text-xs bg-white border-blue-300 text-blue-800" onClick={handleGeocodeAddress} disabled={geocoding}>
                  {geocoding ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Globe className="h-3.5 w-3.5 mr-1 text-blue-600" />}
                  Geocodificar por Dirección
                </Button>
                <Button type="button" variant="outline" size="sm" className="h-8 text-xs bg-white border-blue-300 text-blue-800" onClick={captureGPSLocation} disabled={geocoding}>
                  <Navigation className="h-3.5 w-3.5 mr-1 text-green-600" />
                  Tomar GPS Actual
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[11px] font-medium text-gray-600">Latitud</label>
                  <Input placeholder="Ej: 4.53389" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} className="h-8 text-xs font-mono bg-white" />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-gray-600">Longitud</label>
                  <Input placeholder="Ej: -75.68111" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} className="h-8 text-xs font-mono bg-white" />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-gray-600">Radio Geocerca (Metros)</label>
                  <Input type="number" placeholder="100" value={form.geofence_radius} onChange={(e) => setForm({ ...form, geofence_radius: e.target.value })} className="h-8 text-xs bg-white" />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <DialogClose asChild><Button variant="outline" size="sm" onClick={() => setEditingClient(null)}>Cancelar</Button></DialogClose>
            <Button size="sm" onClick={handleSaveClient} disabled={saving || !form.name}>
              {saving ? "Guardando..." : editingClient ? "Guardar Cambios" : "Crear Cliente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL DE CARGA MASIVA DE CLIENTES / SEDES */}
      <Dialog open={importModalOpen} onOpenChange={setImportModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Upload className="h-5 w-5 text-blue-600" /> Carga Masiva de Clientes y Sedes (CSV / Excel)
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="p-4 border-2 border-dashed rounded-xl bg-slate-50 text-center space-y-2">
              <FileText className="h-8 w-8 text-slate-400 mx-auto" />
              <p className="font-semibold text-slate-700">Selecciona el archivo CSV con la lista de clientes o sedes</p>
              <p className="text-[11px] text-slate-500">Asegúrate de usar la plantilla oficial con encabezados compatibles.</p>

              <div className="pt-2 flex justify-center gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={handleDownloadClientsTemplate} className="gap-1 text-xs">
                  <Download className="h-3.5 w-3.5" /> Descargar Plantilla CSV
                </Button>

                <label className="cursor-pointer">
                  <span className="inline-flex items-center justify-center px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs gap-1 shadow">
                    <Upload className="h-3.5 w-3.5" /> Seleccionar Archivo CSV
                  </span>
                  <input type="file" accept=".csv,text/csv" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>

              {importFileName && (
                <p className="text-xs font-mono font-bold text-blue-600 pt-1">Archivo cargado: {importFileName} ({importRows.length} filas detectadas)</p>
              )}
            </div>

            {/* Preview Table */}
            {importRows.length > 0 && !importResult && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-slate-800">Vista Previa ({importRows.length} Registros)</p>
                  <span className="text-[11px] text-slate-500">Primeras filas a procesar</span>
                </div>
                <div className="max-h-48 overflow-y-auto border rounded-lg text-[11px]">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-100">
                        <TableHead>NIT</TableHead>
                        <TableHead>Nombre Cliente / Sede</TableHead>
                        <TableHead>Dirección</TableHead>
                        <TableHead>Ciudad</TableHead>
                        <TableHead>Departamento</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importRows.slice(0, 5).map((row, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-mono">{row.nit || "—"}</TableCell>
                          <TableCell className="font-bold">{row.name || row.nombre}</TableCell>
                          <TableCell>{row.address || row.direccion}</TableCell>
                          <TableCell>{row.city || row.ciudad}</TableCell>
                          <TableCell>{row.department || row.departamento}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Results Report */}
            {importResult && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
                <p className="font-bold text-blue-900 text-sm flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-green-600" /> Resultado de Importación Masiva
                </p>
                <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
                  <div className="p-2 bg-white rounded border"><p className="text-lg font-bold text-green-600">{importResult.created_count}</p><p className="text-[10px] text-slate-500">Creados Exitosamente</p></div>
                  <div className="p-2 bg-white rounded border"><p className="text-lg font-bold text-amber-600">{importResult.skipped_count}</p><p className="text-[10px] text-slate-500">Omitidos / Errores</p></div>
                  <div className="p-2 bg-white rounded border"><p className="text-lg font-bold text-slate-800">{importResult.total_processed}</p><p className="text-[10px] text-slate-500">Total Procesados</p></div>
                </div>

                {importResult.errors && importResult.errors.length > 0 && (
                  <div className="pt-2">
                    <p className="font-semibold text-slate-700 text-[11px]">Detalle de observaciones:</p>
                    <ul className="max-h-24 overflow-y-auto text-[10px] text-red-700 bg-white p-2 rounded border space-y-0.5 font-mono">
                      {importResult.errors.map((err: string, i: number) => (
                        <li key={i}>• {err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setImportModalOpen(false)}>
              Cerrar
            </Button>
            {importRows.length > 0 && !importResult && (
              <Button onClick={handleConfirmImport} disabled={importing} className="bg-blue-600 hover:bg-blue-700 text-white font-bold">
                {importing ? "Importando Registros..." : `Confirmar Importación (${importRows.length} Clientes/Sedes)`}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
