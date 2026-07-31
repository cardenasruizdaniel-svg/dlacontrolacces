"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Save, Loader2, User, Briefcase, FileText, Camera,
  Shield, Key, Smartphone, ClipboardList, Upload
} from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface EmployeeData {
  id: string; code: string; document_type: string; document_number: string;
  first_name: string; last_name: string; email: string | null; phone: string | null;
  status: string; photo_url: string | null; address: string | null; city: string | null;
  department: string | null; birth_date: string | null; eps: string | null;
  hire_date: string | null; company_id: string; job_position_id: string | null;
  cost_center_id: string | null;
  username: string | null; has_access: boolean; role_id: string | null; role_name: string | null;
  platform_access: string; account_status: string; is_superuser: boolean;
  force_password_change: boolean; last_login: string | null; last_platform: string | null;
  failed_login_attempts: number; first_login_completed: boolean; biometric_enrolled: boolean;
  mfa_enabled: boolean; app_status: string;
}

interface ContractData {
  id: string; code: string; employee_id: string; contract_type_id: string;
  start_date: string; end_date: string | null; salary: number; status: string;
  work_scheme: string; salary_type: string;
}

interface RoleData {
  id: string; name: string; display_name: string | null; description: string | null;
  is_active: boolean; is_system: boolean; level: number; color: string | null;
  permission_count: number; user_count: number;
}

export default function EmployeeDetailClient() {
  const params = useParams();
  const router = useRouter();
  const empId = params?.id as string;

  const [employee, setEmployee] = useState<EmployeeData | null>(null);
  const [contracts, setContracts] = useState<ContractData[]>([]);
  const [roles, setRoles] = useState<RoleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("personal");

  const [form, setForm] = useState<Record<string, string>>({});
  const [accessForm, setAccessForm] = useState<Record<string, string>>({});
  const [newPassword, setNewPassword] = useState("");
  const [creatingAccess, setCreatingAccess] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPasswordInit, setNewPasswordInit] = useState("");

  const loadData = useCallback(async () => {
    if (!empId) return;
    setLoading(true);
    try {
      const companyId = localStorage.getItem("company_id") || "";
      const [empRes, contractRes, rolesRes] = await Promise.allSettled([
        api.get(`/employees/${empId}`),
        api.get(`/contracts`, { params: { company_id: companyId, page_size: 100 } }),
        api.get(`/iam/roles`),
      ]);

      if (empRes.status === "fulfilled") {
        const emp = empRes.value.data;
        setEmployee(emp);
        setForm({
          code: emp.code || "", document_type: emp.document_type || "CC",
          document_number: emp.document_number || "", first_name: emp.first_name || "",
          last_name: emp.last_name || "", email: emp.email || "", phone: emp.phone || "",
          status: emp.status || "active", address: emp.address || "", city: emp.city || "",
          hire_date: emp.hire_date || "",
        });
        setAccessForm({
          platform_access: emp.platform_access || "none",
          account_status: emp.account_status || "inactive",
        });
        setNewUsername(emp.username || emp.code || "");
      }

      if (contractRes.status === "fulfilled") {
        const cts = contractRes.value.data.items || [];
        setContracts(cts.filter((c: ContractData) => c.employee_id === empId));
      }
      if (rolesRes.status === "fulfilled") setRoles(rolesRes.value.data.items || []);
    } catch (err) {
      console.error("Error loading employee:", err);
    } finally {
      setLoading(false);
    }
  }, [empId]);

  useEffect(() => { loadData(); }, [loadData]);

  const saveEmployee = async () => {
    setSaving(true);
    try {
      await api.put(`/employees/${empId}`, {
        first_name: form.first_name, last_name: form.last_name, email: form.email,
        phone: form.phone, address: form.address, city: form.city, status: form.status,
      });
      if (employee?.has_access) {
        await api.put(`/employees/${empId}/access`, {
          platform_access: accessForm.platform_access,
          account_status: accessForm.account_status,
        });
      }
      await loadData();
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setSaving(false);
    }
  };

  const createAccess = async () => {
    if (!newUsername || !newPasswordInit) return;
    setCreatingAccess(true);
    try {
      await api.post(`/employees/${empId}/access`, {
        username: newUsername, password: newPasswordInit,
        platform_access: "both",
      });
      await loadData();
    } catch (err) {
      console.error("Create access error:", err);
    } finally {
      setCreatingAccess(false);
    }
  };

  const assignRole = async (roleId: string) => {
    setSaving(true);
    try {
      await api.put(`/employees/${empId}/access`, { role_id: roleId });
      await loadData();
    } finally { setSaving(false); }
  };

  const resetPassword = async () => {
    if (!newPassword) return;
    setSaving(true);
    try {
      await api.post(`/employees/${empId}/access/reset-password`, { password: newPassword });
      setNewPassword("");
      await loadData();
    } finally { setSaving(false); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="p-6">
        <Button variant="ghost" onClick={() => router.push("/employees")} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Volver
        </Button>
        <Card><CardContent className="p-8 text-center text-gray-500">Empleado no encontrado</CardContent></Card>
      </div>
    );
  }

  const f = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));
  const fa = (field: string, value: string) => setAccessForm(prev => ({ ...prev, [field]: value }));

  const statusBadge = (s: string) => {
    const m: Record<string, string> = {
      active: "bg-green-100 text-green-800", inactive: "bg-red-100 text-red-800",
      suspended: "bg-yellow-100 text-yellow-800", locked: "bg-red-100 text-red-800",
    };
    return <Badge className={m[s] || "bg-gray-100 text-gray-800"}>{s}</Badge>;
  };

  const platformBadge = (p: string) => {
    const m: Record<string, string> = {
      web: "bg-blue-100 text-blue-800", mobile: "bg-purple-100 text-purple-800",
      both: "bg-indigo-100 text-indigo-800", none: "bg-gray-100 text-gray-800",
    };
    return <Badge className={m[p] || "bg-gray-100 text-gray-800"}>{p}</Badge>;
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/employees")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{employee.first_name} {employee.last_name}</h1>
            <p className="text-sm text-gray-500">
              Codigo: {employee.code} | Doc: {employee.document_type} {employee.document_number}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {employee.has_access && statusBadge(employee.account_status)}
          {employee.has_access && platformBadge(employee.platform_access)}
          <Button onClick={saveEmployee} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Guardar Cambios
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-9">
          <TabsTrigger value="personal"><User className="h-4 w-4 mr-1" />Personal</TabsTrigger>
          <TabsTrigger value="laboral"><Briefcase className="h-4 w-4 mr-1" />Laboral</TabsTrigger>
          <TabsTrigger value="contrato"><FileText className="h-4 w-4 mr-1" />Contrato</TabsTrigger>
          <TabsTrigger value="documentos"><Upload className="h-4 w-4 mr-1" />Documentos</TabsTrigger>
          <TabsTrigger value="foto"><Camera className="h-4 w-4 mr-1" />Foto/Biometria</TabsTrigger>
          <TabsTrigger value="acceso"><Key className="h-4 w-4 mr-1" />Acceso al Sistema</TabsTrigger>
          <TabsTrigger value="roles"><Shield className="h-4 w-4 mr-1" />Roles/Permisos</TabsTrigger>
          <TabsTrigger value="dispositivos"><Smartphone className="h-4 w-4 mr-1" />Dispositivos</TabsTrigger>
          <TabsTrigger value="auditoria"><ClipboardList className="h-4 w-4 mr-1" />Auditoria</TabsTrigger>
        </TabsList>

        {/* 1. PERSONAL */}
        <TabsContent value="personal">
          <Card>
            <CardHeader><CardTitle>Datos Personales</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-medium">Nombres</label><Input value={form.first_name || ""} onChange={e => f("first_name", e.target.value)} /></div>
                <div><label className="text-sm font-medium">Apellidos</label><Input value={form.last_name || ""} onChange={e => f("last_name", e.target.value)} /></div>
                <div><label className="text-sm font-medium">Tipo Documento</label>
                  <select className="w-full border rounded-md px-3 py-2 text-sm" value={form.document_type || "CC"} onChange={e => f("document_type", e.target.value)}>
                    <option value="CC">Cedula Ciudadania</option><option value="CE">Cedula Extranjeria</option><option value="TI">Tarjeta Identidad</option><option value="PP">Pasaporte</option>
                  </select>
                </div>
                <div><label className="text-sm font-medium">No. Documento</label><Input value={form.document_number || ""} onChange={e => f("document_number", e.target.value)} /></div>
                <div><label className="text-sm font-medium">Email</label><Input type="email" value={form.email || ""} onChange={e => f("email", e.target.value)} /></div>
                <div><label className="text-sm font-medium">Telefono</label><Input value={form.phone || ""} onChange={e => f("phone", e.target.value)} /></div>
                <div><label className="text-sm font-medium">Estado</label>
                  <select className="w-full border rounded-md px-3 py-2 text-sm" value={form.status || "active"} onChange={e => f("status", e.target.value)}>
                    <option value="active">Activo</option><option value="inactive">Inactivo</option><option value="on_leave">En Licencia</option>
                  </select>
                </div>
                <div className="col-span-2"><label className="text-sm font-medium">Direccion</label><Input value={form.address || ""} onChange={e => f("address", e.target.value)} /></div>
                <div><label className="text-sm font-medium">Ciudad</label><Input value={form.city || ""} onChange={e => f("city", e.target.value)} /></div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. LABORAL */}
        <TabsContent value="laboral">
          <Card>
            <CardHeader><CardTitle>Información Laboral</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-medium">Fecha Ingreso</label><Input type="date" value={form.hire_date || ""} onChange={e => f("hire_date", e.target.value)} /></div>
                <div><label className="text-sm font-medium">EPS</label><Input value={employee.eps || ""} disabled /></div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. CONTRATO */}
        <TabsContent value="contrato">
          <Card>
            <CardHeader><CardTitle>Contratos</CardTitle><CardDescription>Contratos asociados al empleado</CardDescription></CardHeader>
            <CardContent>
              {contracts.length === 0 ? (
                <p className="text-gray-500 text-sm">No hay contratos registrados</p>
              ) : (
                <div className="space-y-3">
                  {contracts.map(c => (
                    <div key={c.id} className="border rounded-lg p-4 flex justify-between items-center">
                      <div>
                        <p className="font-medium">{c.code}</p>
                        <p className="text-sm text-gray-500">{c.start_date} - {c.end_date || "Actual"} | {c.work_scheme}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="font-semibold">${c.salary?.toLocaleString()}</p>
                        {statusBadge(c.status)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 4. DOCUMENTOS */}
        <TabsContent value="documentos">
          <Card>
            <CardHeader><CardTitle>Documentos</CardTitle></CardHeader>
            <CardContent>
              <p className="text-gray-500 text-sm">Modulo de documentos en construccion.</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 5. FOTO / BIOMETRIA */}
        <TabsContent value="foto">
          <Card>
            <CardHeader><CardTitle>Foto y Reconocimiento Facial</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-6">
                <div className="w-40 h-40 border-2 border-dashed rounded-lg flex items-center justify-center bg-gray-50">
                  {employee.photo_url ? (
                    <img src={employee.photo_url} alt="Foto" className="w-full h-full object-cover rounded-lg" />
                  ) : (
                    <Camera className="h-10 w-10 text-gray-300" />
                  )}
                </div>
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Estado Facial:</span>
                    {employee.biometric_enrolled ? (
                      <Badge className="bg-green-100 text-green-800">Inscrito</Badge>
                    ) : (
                      <Badge className="bg-gray-100 text-gray-800">No Inscrito</Badge>
                    )}
                  </div>
                  <Button variant="outline" size="sm"><Camera className="h-4 w-4 mr-2" />Tomar Foto</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 6. ACCESO AL SISTEMA */}
        <TabsContent value="acceso">
          <Card>
            <CardHeader><CardTitle>Acceso al Sistema</CardTitle><CardDescription>Configuracion de cuenta de usuario y acceso</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              {employee.has_access ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-sm font-medium">Username</label><Input value={employee.username || ""} disabled /></div>
                    <div><label className="text-sm font-medium">Email</label><Input value={employee.email || ""} disabled /></div>
                    <div><label className="text-sm font-medium">Estado Cuenta</label>
                      <select className="w-full border rounded-md px-3 py-2 text-sm" value={accessForm.account_status || "active"} onChange={e => fa("account_status", e.target.value)}>
                        <option value="active">Activa</option><option value="suspended">Suspendida</option><option value="locked">Bloqueada</option><option value="inactive">Inactiva</option>
                      </select>
                    </div>
                    <div><label className="text-sm font-medium">Acceso Plataforma</label>
                      <select className="w-full border rounded-md px-3 py-2 text-sm" value={accessForm.platform_access || "both"} onChange={e => fa("platform_access", e.target.value)}>
                        <option value="web">Solo Web</option><option value="mobile">Solo Mobile</option><option value="both">Ambas</option>
                      </select>
                    </div>
                    <div><label className="text-sm font-medium">Ultimo Login</label><Input value={employee.last_login || "Nunca"} disabled /></div>
                    <div><label className="text-sm font-medium">Ultima Plataforma</label><Input value={employee.last_platform || "N/A"} disabled /></div>
                    <div><label className="text-sm font-medium">Intentos Fallidos</label><Input value={String(employee.failed_login_attempts)} disabled /></div>
                    <div><label className="text-sm font-medium">App Status</label><Input value={employee.app_status} disabled /></div>
                    <div><label className="text-sm font-medium">Primera Vez</label><Input value={employee.first_login_completed ? "Completado" : "Pendiente"} disabled /></div>
                    <div><label className="text-sm font-medium">Superuser</label><Input value={employee.is_superuser ? "Si" : "No"} disabled /></div>
                  </div>
                  <div className="border-t pt-4 mt-4">
                    <h4 className="text-sm font-semibold mb-3">Cambiar Contrasena</h4>
                    <div className="flex gap-2">
                      <Input type="password" placeholder="Nueva contrasena" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="flex-1" />
                      <Button variant="outline" onClick={resetPassword} disabled={!newPassword || saving}>
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Key className="h-4 w-4 mr-1" />}Resetear
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">Este empleado no tiene cuenta de usuario</p>
                  <div className="flex gap-2 justify-center max-w-md mx-auto">
                    <Input placeholder="Username" value={newUsername} onChange={e => setNewUsername(e.target.value)} />
                    <Input type="password" placeholder="Contrasena temporal" value={newPasswordInit} onChange={e => setNewPasswordInit(e.target.value)} />
                    <Button onClick={createAccess} disabled={creatingAccess || !newUsername || !newPasswordInit}>
                      {creatingAccess ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Key className="h-4 w-4 mr-2" />}Crear Cuenta
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 7. ROLES / PERMISOS */}
        <TabsContent value="roles">
          <Card>
            <CardHeader><CardTitle>Asignacion de Rol</CardTitle></CardHeader>
            <CardContent>
              {employee.has_access ? (
                <div className="space-y-3">
                  {roles.map(r => (
                    <div key={r.id} className={`border rounded-lg p-3 flex justify-between items-center cursor-pointer transition-colors ${employee.role_id === r.id ? "border-blue-500 bg-blue-50" : "hover:bg-gray-50"}`}
                         onClick={() => assignRole(r.id)}>
                      <div className="flex items-center gap-3">
                        {r.color && <div className="w-3 h-3 rounded-full" style={{ backgroundColor: r.color }} />}
                        <div>
                          <p className="font-medium">{r.display_name || r.name}</p>
                          <p className="text-xs text-gray-500">{r.description} | Nivel: {r.level} | {r.permission_count} permisos</p>
                        </div>
                      </div>
                      {employee.role_id === r.id && <Badge className="bg-blue-100 text-blue-800">Asignado</Badge>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">Primero cree una cuenta de usuario en la pestaña "Acceso al Sistema"</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 8. DISPOSITIVOS */}
        <TabsContent value="dispositivos">
          <Card>
            <CardHeader><CardTitle>Dispositivos y Sesiones</CardTitle><CardDescription>Gestion de dispositivos moviles</CardDescription></CardHeader>
            <CardContent>
              <p className="text-gray-500 text-sm">Las sesiones se gestionan desde el modulo de IAM. Los dispositivos moviles se controlan desde la app movil.</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 9. AUDITORIA */}
        <TabsContent value="auditoria">
          <Card>
            <CardHeader><CardTitle>Registro de Auditoria</CardTitle><CardDescription>Actividad reciente del usuario</CardDescription></CardHeader>
            <CardContent>
              <p className="text-gray-500 text-sm">Los registros de auditoria se muestran en el modulo de IAM.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
