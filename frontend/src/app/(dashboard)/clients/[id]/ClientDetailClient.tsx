"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Building2, MapPin, Phone, Mail, Globe, Settings, Save, Loader2, Pencil, Plus, Trash2, Navigation, Power, CheckCircle2, AlertCircle } from "lucide-react";

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
  enterprise: "Empresa", individual: "Persona Natural", project: "Proyecto", ips: "IPS", hospital: "Hospital", clinic: "Clínica"
};

export default function ClientDetailClient() {
  const { id } = useParams();
  const router = useRouter();
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [branches, setBranches] = useState<any[]>([]);
  const [persons, setPersons] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [newBranchName, setNewBranchName] = useState("");
  const [newBranchAddress, setNewBranchAddress] = useState("");
  const [newPersonName, setNewPersonName] = useState("");
  const [newContactName, setNewContactName] = useState("");
  const [newContactType, setNewContactType] = useState("email");
  const [newContactValue, setNewContactValue] = useState("");
  const [geoLoading, setGeoLoading] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const loadClient = useCallback(async () => {
    try {
      const [cRes, locRes] = await Promise.all([
        api.get(`/clients/${id}`),
        api.get(`/clients/${id}/locations`).catch(() => ({ data: [] })),
      ]);
      setClient(cRes.data);
      setForm({
        name: cRes.data.name || "",
        trade_name: cRes.data.trade_name || "",
        client_type: cRes.data.client_type || "enterprise",
        nit: cRes.data.nit || "",
        email: cRes.data.email || "",
        phone: cRes.data.phone || "",
        mobile: cRes.data.mobile || "",
        website: cRes.data.website || "",
        address: cRes.data.address || "",
        city: cRes.data.city || "Armenia",
        department: cRes.data.department || "Quindío",
        status: cRes.data.status || "active",
        geofence_radius: String(cRes.data.geofence_radius || "100"),
        latitude: cRes.data.latitude != null ? String(cRes.data.latitude) : "",
        longitude: cRes.data.longitude != null ? String(cRes.data.longitude) : "",
        notes: cRes.data.notes || "",
      });
      setBranches(Array.isArray(locRes.data) ? locRes.data : locRes.data.items || []);
      try {
        const cRes2 = await api.get(`/clients/${id}/contacts`);
        setContacts(Array.isArray(cRes2.data) ? cRes2.data : cRes2.data.items || []);
      } catch (e: any) { console.error("ClientDetail load contacts error:", e); }
      try {
        const pRes = await api.get(`/clients/${id}/personas`);
        setPersons(Array.isArray(pRes.data?.items) ? pRes.data.items : Array.isArray(pRes.data) ? pRes.data : []);
      } catch (e: any) { console.error("ClientDetail load persons error:", e); }
    } catch (e: any) {
      console.error("Client load error:", e);
      router.push("/clients");
    }
    setLoading(false);
  }, [id, router]);

  useEffect(() => { loadClient(); }, [loadClient]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const parseNum = (val: any) => {
        if (val === null || val === undefined || val === "") return null;
        const n = parseFloat(val);
        return isNaN(n) ? null : n;
      };

      const payload: any = {
        name: form.name,
        trade_name: form.trade_name || null,
        client_type: form.client_type,
        nit: form.nit || null,
        email: form.email || null,
        phone: form.phone || null,
        mobile: form.mobile || null,
        website: form.website || null,
        address: form.address || null,
        city: form.city || null,
        department: form.department || null,
        status: form.status || "active",
        geofence_radius: parseNum(form.geofence_radius) || 100,
        latitude: parseNum(form.latitude),
        longitude: parseNum(form.longitude),
        notes: form.notes || null,
      };

      await api.put(`/clients/${id}`, payload);
      showToast("success", "Datos del cliente y georreferenciación actualizados correctamente");
      setEditing(false);
      await loadClient();
    } catch (e: any) {
      console.error("ClientDetail save error:", e);
      const detail = e?.response?.data?.detail;
      const errMsg = typeof detail === "string" ? detail : Array.isArray(detail) ? detail.map((d: any) => d.msg || JSON.stringify(d)).join(", ") : "Error al guardar cliente. Verifique los datos.";
      showToast("error", errMsg);
    }
    setSaving(false);
  };

  const handleGeocodeAddress = async () => {
    if (!form.address) {
      showToast("error", "Ingrese primero la dirección para calcular la georreferencia");
      return;
    }
    setGeoLoading(true);
    try {
      const query = encodeURIComponent(`${form.address}, ${form.city || ""}, ${form.department || ""}, Colombia`);
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
        showToast("success", `Georreferencia obtenida de dirección: Lat ${lat}, Lon ${lon}`);
      } else {
        showToast("error", "No se encontraron coordenadas exactas. Ingrese latitud/longitud manualmente.");
      }
    } catch {
      showToast("error", "Error en el servicio de geocodificación");
    }
    setGeoLoading(false);
  };

  const captureCurrentLocation = () => {
    if (!navigator.geolocation) {
      showToast("error", "Geolocalización no disponible en su navegador");
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((prev: any) => ({
          ...prev,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
        }));
        showToast("success", "Ubicación GPS capturada correctamente");
        setGeoLoading(false);
      },
      (err) => { showToast("error", "Error GPS: " + err.message); setGeoLoading(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleStatusToggle = async () => {
    const newStatus = client.status === "active" ? "inactive" : "active";
    const action = newStatus === "inactive" ? "inactivar" : "activar";
    if (!confirm(`¿Desea ${action} este cliente?`)) return;
    try {
      await api.patch(`/clients/${id}/status`, { status: newStatus });
      showToast("success", `Cliente ${newStatus === "active" ? "activado" : "inactivado"} correctamente`);
      loadClient();
    } catch (e: any) {
      showToast("error", e?.response?.data?.detail || "Error al cambiar estado");
    }
  };

  const handleDelete = async () => {
    if (!confirm("¿Desea eliminar este cliente? Esta acción no se puede deshacer.")) return;
    try {
      await api.delete(`/clients/${id}`);
      showToast("success", "Cliente eliminado correctamente");
      router.push("/clients");
    } catch (e: any) {
      showToast("error", e?.response?.data?.detail || "Error al eliminar");
    }
  };

  const addBranch = async () => {
    if (!newBranchName) return;
    try {
      const payload: any = { name: newBranchName, latitude: 0, longitude: 0 };
      if (newBranchAddress) payload.address = newBranchAddress;
      if (client.latitude) payload.latitude = parseFloat(String(client.latitude));
      if (client.longitude) payload.longitude = parseFloat(String(client.longitude));
      await api.post(`/clients/${id}/locations`, payload);
      setNewBranchName("");
      setNewBranchAddress("");
      showToast("success", "Sede agregada correctamente");
      loadClient();
    } catch (e: any) {
      showToast("error", e?.response?.data?.detail || "Error al agregar sede");
    }
  };

  const deleteBranch = async (lid: string) => {
    if (!confirm("¿Desea eliminar esta sede?")) return;
    try {
      await api.delete(`/clients/${id}/locations/${lid}`);
      showToast("success", "Sede eliminada");
      loadClient();
    } catch (e: any) {
      showToast("error", e?.response?.data?.detail || "Error al eliminar sede");
    }
  };

  const addPerson = async () => {
    if (!newPersonName) return;
    try {
      await api.post(`/clients/${id}/patients`, {
        document_type: "CC", document_number: "0",
        first_name: newPersonName, last_name: "",
      });
      setNewPersonName("");
      showToast("success", "Paciente agregado correctamente");
      loadClient();
    } catch (e: any) {
      showToast("error", e?.response?.data?.detail || "Error al agregar paciente");
    }
  };

  const deletePerson = async (pid: string) => {
    if (!confirm("¿Desea eliminar este paciente?")) return;
    try {
      await api.delete(`/clients/${id}/patients/${pid}`);
      showToast("success", "Paciente eliminado");
      loadClient();
    } catch (e: any) {
      showToast("error", e?.response?.data?.detail || "Error al eliminar paciente");
    }
  };

  const addContact = async () => {
    if (!newContactValue || !newContactName) return;
    try {
      const payload: any = { full_name: newContactName };
      if (newContactType === "email") payload.email = newContactValue;
      else if (newContactType === "phone") payload.phone = newContactValue;
      else if (newContactType === "mobile") payload.mobile = newContactValue;
      else payload.email = newContactValue;
      await api.post(`/clients/${id}/contacts`, payload);
      setNewContactValue(""); setNewContactName("");
      showToast("success", "Contacto agregado correctamente");
      loadClient();
    } catch (e: any) {
      showToast("error", e?.response?.data?.detail || "Error al agregar contacto");
    }
  };

  const deleteContact = async (cid: string) => {
    if (!confirm("¿Desea eliminar este contacto?")) return;
    try {
      await api.delete(`/clients/${id}/contacts/${cid}`);
      showToast("success", "Contacto eliminado");
      loadClient();
    } catch (e: any) {
      showToast("error", e?.response?.data?.detail || "Error al eliminar contacto");
    }
  };

  // Available cities based on selected department
  const selectedDept = form.department || "Quindío";
  const availableCities = COLOMBIAN_CITIES_BY_DEPT[selectedDept] || ["Armenia"];

  if (loading) return <div className="p-12 text-center text-muted-foreground">Cargando datos del cliente...</div>;
  if (!client) return null;

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-white text-sm max-w-md ${toast.type === "success" ? "bg-green-600" : "bg-red-600"}`}>
          {toast.type === "success" ? <CheckCircle2 className="h-4 w-4 flex-shrink-0" /> : <AlertCircle className="h-4 w-4 flex-shrink-0" />}
          {toast.message}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push("/clients")}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{client.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline">{typeLabels[client.client_type] || client.client_type}</Badge>
              <Badge variant={client.status === "active" ? "default" : "secondary"}>
                {client.status === "active" ? "Activo" : "Inactivo"}
              </Badge>
              {client.nit && <span className="text-sm text-muted-foreground font-mono">NIT: {client.nit}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleStatusToggle}>
            <Power className="mr-2 h-4 w-4" />{client.status === "active" ? "Inactivar" : "Activar"}
          </Button>
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            <Trash2 className="mr-2 h-4 w-4" />Eliminar
          </Button>
          <Button variant={editing ? "outline" : "default"} onClick={() => editing ? setEditing(false) : setEditing(true)}>
            {editing ? "Cancelar Edición" : <><Pencil className="mr-2 h-4 w-4" />Editar Cliente</>}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Datos Generales */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Building2 className="h-4 w-4 text-blue-600" /> Datos Generales</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {editing ? (
              <>
                <div className="space-y-1"><label className="text-xs font-medium text-gray-700">Nombre / Razón Social *</label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-9 text-sm" /></div>
                <div className="space-y-1"><label className="text-xs font-medium text-gray-700">Nombre Comercial</label><Input value={form.trade_name} onChange={(e) => setForm({ ...form, trade_name: e.target.value })} className="h-9 text-sm" /></div>
                <div className="space-y-1"><label className="text-xs font-medium text-gray-700">NIT / Identificación</label><Input value={form.nit} onChange={(e) => setForm({ ...form, nit: e.target.value })} className="h-9 text-sm font-mono" /></div>
                <div className="space-y-1"><label className="text-xs font-medium text-gray-700">Tipo de Cliente</label>
                  <select className="flex h-9 w-full rounded-md border bg-background px-3 py-1.5 text-sm" value={form.client_type} onChange={(e) => setForm({ ...form, client_type: e.target.value })}>
                    {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </>
            ) : (
              <>
                <InfoRow label="Nombre Comercial" value={client.trade_name || "-"} />
                <InfoRow label="NIT" value={client.nit || "-"} />
                <InfoRow label="Tipo de Cliente" value={typeLabels[client.client_type] || client.client_type} />
                <InfoRow label="Estado" value={client.status === "active" ? "Activo" : "Inactivo"} />
              </>
            )}
          </CardContent>
        </Card>

        {/* Contacto & Ubicación Catálogos */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Phone className="h-4 w-4 text-green-600" /> Contacto & Ubicación Catálogo Colombia</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {editing ? (
              <>
                <div className="space-y-1"><label className="text-xs font-medium text-gray-700">Email de Contacto</label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="h-9 text-sm" /></div>
                <div className="space-y-1"><label className="text-xs font-medium text-gray-700">Teléfono</label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="h-9 text-sm" /></div>
                <div className="space-y-1"><label className="text-xs font-medium text-gray-700">Celular</label><Input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} className="h-9 text-sm" /></div>
                <div className="space-y-1"><label className="text-xs font-medium text-gray-700">Dirección</label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="h-9 text-sm" /></div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
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
                  <div className="space-y-1">
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
              </>
            ) : (
              <>
                <InfoRow label="Email" value={client.email || "-"} icon={<Mail className="h-3.5 w-3.5 text-blue-500" />} />
                <InfoRow label="Teléfono" value={client.phone || "-"} icon={<Phone className="h-3.5 w-3.5 text-green-500" />} />
                <InfoRow label="Celular" value={client.mobile || "-"} />
                <InfoRow label="Dirección" value={client.address || "-"} />
                <InfoRow label="Ciudad / Depto" value={`${client.city || "Armenia"}, ${client.department || "Quindío"}`} icon={<MapPin className="h-3.5 w-3.5 text-red-500" />} />
              </>
            )}
          </CardContent>
        </Card>

        {/* Georreferenciación & Geocerca */}
        <Card className="md:col-span-2 border-blue-200 bg-blue-50/30">
          <CardHeader><CardTitle className="flex items-center gap-2 text-base text-blue-900"><Navigation className="h-4 w-4 text-blue-600" /> Georreferenciación & Comparación Geográfica (App Móvil)</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {editing ? (
              <>
                <div className="flex gap-2 mb-2">
                  <Button type="button" variant="outline" size="sm" className="h-8 text-xs bg-white border-blue-300 text-blue-800" onClick={handleGeocodeAddress} disabled={geoLoading}>
                    {geoLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Globe className="h-3.5 w-3.5 mr-1 text-blue-600" />}
                    Geocodificar por Dirección
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="h-8 text-xs bg-white border-blue-300 text-blue-800" onClick={captureCurrentLocation} disabled={geoLoading}>
                    <Navigation className="h-3.5 w-3.5 mr-1 text-green-600" />
                    Tomar Ubicación GPS Actual
                  </Button>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1"><label className="text-xs font-medium text-gray-700">Latitud</label><Input placeholder="4.53389" value={form.latitude || ""} onChange={(e) => setForm({ ...form, latitude: e.target.value })} className="h-9 text-sm font-mono bg-white" /></div>
                  <div className="space-y-1"><label className="text-xs font-medium text-gray-700">Longitud</label><Input placeholder="-75.68111" value={form.longitude || ""} onChange={(e) => setForm({ ...form, longitude: e.target.value })} className="h-9 text-sm font-mono bg-white" /></div>
                  <div className="space-y-1"><label className="text-xs font-medium text-gray-700">Radio Geocerca (Metros)</label><Input type="number" placeholder="100" value={form.geofence_radius} onChange={(e) => setForm({ ...form, geofence_radius: e.target.value })} className="h-9 text-sm bg-white" /></div>
                </div>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  {client.latitude && client.longitude ? (
                    <InfoRow label="Coordenadas GPS" value={`${Number(client.latitude).toFixed(6)}, ${Number(client.longitude).toFixed(6)}`} icon={<Navigation className="h-3.5 w-3.5 text-blue-600" />} />
                  ) : (
                    <span className="text-xs text-amber-700 font-medium">⚠️ Coordenadas GPS no configuradas aún</span>
                  )}
                  <InfoRow label="Radio Geocerca Validación" value={client.geofence_radius ? `${client.geofence_radius} metros` : "100 metros"} />
                </div>
                {client.latitude && client.longitude && (
                  <div className="flex items-center justify-end">
                    <a
                      href={`https://www.google.com/maps?q=${client.latitude},${client.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors"
                    >
                      <Globe className="h-3.5 w-3.5" /> Ver en Google Maps
                    </a>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Settings className="h-4 w-4" /> Notas / Observaciones</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {editing ? (
              <div className="space-y-1"><textarea className="flex min-h-[80px] w-full rounded-md border bg-background px-3 py-2 text-sm" value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Observaciones adicionales del cliente..." /></div>
            ) : (
              <p className="text-sm text-gray-700">{client.notes || "Sin observaciones adicionales."}</p>
            )}
          </CardContent>
        </Card>

        {editing && (
          <div className="md:col-span-2 flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setEditing(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !form.name}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Guardar Cambios
            </Button>
          </div>
        )}
      </div>

      {/* Sedes / Ubicaciones */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-red-500" /> Sedes / Ubicaciones Secundarias ({branches.length})</span>
            <div className="flex items-center gap-2">
              <Input placeholder="Nombre de la sede" className="w-48 h-8 text-xs" value={newBranchName} onChange={(e) => setNewBranchName(e.target.value)} />
              <Input placeholder="Dirección" className="w-48 h-8 text-xs" value={newBranchAddress} onChange={(e) => setNewBranchAddress(e.target.value)} />
              <Button size="sm" className="h-8 text-xs" onClick={addBranch} disabled={!newBranchName}><Plus className="h-3.5 w-3.5 mr-1" />Agregar Sede</Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {branches.length === 0 ? <p className="text-xs text-muted-foreground">Sin sedes secundarias registradas</p> : (
            <div className="space-y-2">
              {branches.map((b) => (
                <div key={b.id} className="flex items-center justify-between p-3 border rounded-lg bg-slate-50/50">
                  <div>
                    <p className="font-medium text-sm text-slate-900">{b.name}</p>
                    {b.address && <p className="text-xs text-slate-500">{b.address}</p>}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => deleteBranch(b.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contactos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2"><Phone className="h-4 w-4 text-green-600" /> Directorio de Contactos ({contacts.length})</span>
            <div className="flex items-center gap-2">
              <Input placeholder="Nombre contacto" className="w-36 h-8 text-xs" value={newContactName} onChange={(e) => setNewContactName(e.target.value)} />
              <select className="flex h-8 rounded-md border bg-background px-2 text-xs" value={newContactType} onChange={(e) => setNewContactType(e.target.value)}>
                <option value="email">Email</option><option value="phone">Teléfono</option><option value="mobile">Celular</option>
              </select>
              <Input placeholder="Valor" className="w-36 h-8 text-xs" value={newContactValue} onChange={(e) => setNewContactValue(e.target.value)} />
              <Button size="sm" className="h-8 text-xs" onClick={addContact} disabled={!newContactValue || !newContactName}><Plus className="h-3.5 w-3.5 mr-1" />Agregar</Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {contacts.length === 0 ? <p className="text-xs text-muted-foreground">Sin contactos adicionales registrados</p> : (
            <div className="space-y-2">
              {contacts.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between p-3 border rounded-lg bg-slate-50/50">
                  <div>
                    <p className="font-medium text-sm text-slate-900">{c.full_name}</p>
                    <p className="text-xs text-slate-500">
                      {c.email && `Email: ${c.email}`}{c.email && c.phone ? " | " : ""}
                      {c.phone && `Tel: ${c.phone}`}{(c.email || c.phone) && c.mobile ? " | " : ""}
                      {c.mobile && `Cel: ${c.mobile}`}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => deleteContact(c.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function InfoRow({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-slate-100 last:border-0">
      <span className="text-xs text-muted-foreground flex items-center gap-1.5">{icon}{label}:</span>
      <span className="text-xs font-semibold text-slate-900">{value}</span>
    </div>
  );
}
