"use client";
import React, { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Plus, Search, Pencil, Eye, Ban, Settings, CheckCircle2, AlertCircle, FileText, Upload, Trash2, Download, ExternalLink, ShieldCheck, QrCode } from "lucide-react";
import DigitalSignatureModal from "@/components/contracts/DigitalSignatureModal";

// Default Colombian Contract Types
const DEFAULT_CONTRACT_TYPES = [
  { id: "ct-01", code: "TF-COL", name: "Contrato a Término Fijo (Art. 46 CST)", labor_law_type: "fixed_term", description: "Duración determinada (máx 3 años renovable)" },
  { id: "ct-02", code: "TI-COL", name: "Contrato a Término Indefinido (Art. 47 CST)", labor_law_type: "indefinite", description: "Sin fecha de terminación estipulada" },
  { id: "ct-03", code: "OL-COL", name: "Contrato por Obra o Labor (Art. 45 CST)", labor_law_type: "specific_work", description: "Dura lo que tarden en ejecutarse los trabajos" },
  { id: "ct-04", code: "PS-COL", name: "Contrato de Prestación de Servicios (Civil/Comercial)", labor_law_type: "services", description: "Contratación independiente por honorarios" },
  { id: "ct-05", code: "AP-COL", name: "Contrato de Aprendizaje (Ley 789 de 2002)", labor_law_type: "apprenticeship", description: "Formación teórica y práctica SENA" },
  { id: "ct-06", code: "OC-COL", name: "Contrato Ocasional o Transitorio (Art. 6 CST)", labor_law_type: "transitory", description: "Actividades ajenas al giro ordinario (máx 1 mes)" },
];

const DEFAULT_EPS = [
  "EPS Sura", "Sanitas EPS", "Compensar EPS", "Salud Total EPS", "Nueva EPS",
  "Famisanar EPS", "Coosalud EPS", "Mutual Ser EPS", "EPS Servicio Occidental de Salud (SOS)", "Capital Salud EPS"
];

const DEFAULT_ARL = [
  "Positiva Compañía de Seguros (ARL Positiva)", "ARL Sura", "AXA Colpatria ARL",
  "Colmena Seguros ARL", "Seguros Bolívar ARL", "ARL Alfa", "Equidad Seguros ARL"
];

const DEFAULT_AFP = [
  "Porvenir S.A.", "Protección S.A.", "Colfondos S.A.", "Skandia", "Colpensiones (Administradora Pública)"
];

const emptyContract: Record<string, any> = {
  employee_id: "",
  company_id: "",
  contract_type_id: "ct-01",
  code: "",
  start_date: new Date().toISOString().split("T")[0],
  end_date: "",
  salary: "1423500",
  work_scheme: "full_time",
  weekly_hours: 48,
  daily_hours: 8,
  payment_frequency: "monthly",
  transportation_assistance: true,
  health_provider: "EPS Sura",
  pension_provider: "Porvenir S.A.",
  arl_provider: "Positiva Compañía de Seguros (ARL Positiva)",
  risk_level: "1",
  is_renewable: true,
  notes: "",
};

const schemeLabels: Record<string, string> = {
  full_time: "Tiempo Completo", part_time: "Medio Tiempo", hourly: "Por Horas / Jornal", specific: "Obra o Labor",
};

const laborTypeLabels: Record<string, string> = {
  fixed_term: "Término Fijo", indefinite: "Término Indefinido", specific_work: "Obra / Labor",
  services: "Prestación Servicios", apprenticeship: "Aprendizaje SENA", transitory: "Ocasional / Transitorio",
};

function ContractForm({
  data, onChange, employees, contractTypes, catalogs, editing
}: {
  data: any; onChange: (d: any) => void; employees: any[]; contractTypes: any[]; catalogs?: any; editing?: any;
}) {
  const set = (k: string, v: any) => onChange({ ...data, [k]: v });

  const handleEmployeeChange = async (employeeId: string) => {
    let selectedEmp = employees.find((e) => e.id === employeeId);
    let autoCode = data.code;
    let autoEps = data.health_provider;
    let autoAfp = data.pension_provider;
    let autoArl = data.arl_provider;

    if (employeeId) {
      try {
        const empRes = await api.get(`/employees/${employeeId}`);
        if (empRes.data) {
          selectedEmp = empRes.data;
        }
      } catch {}
    }

    if (selectedEmp) {
      const doc = selectedEmp.document_number || "DOC";
      const code = selectedEmp.code || "EMP";
      autoCode = `CTR-${doc}-${code}`;
      if (selectedEmp.eps) autoEps = selectedEmp.eps;
      if (selectedEmp.afp) autoAfp = selectedEmp.afp;
      if (selectedEmp.arl) autoArl = selectedEmp.arl;
    }

    onChange({
      ...data,
      employee_id: employeeId,
      code: autoCode,
      health_provider: autoEps,
      pension_provider: autoAfp,
      arl_provider: autoArl,
    });
  };

  return (
    <div className="space-y-4 text-sm max-h-[70vh] overflow-y-auto pr-1">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold">Empleado *</label>
          <select
            value={data.employee_id}
            onChange={(e) => handleEmployeeChange(e.target.value)}
            className="w-full p-2 border rounded-md text-xs bg-background"
            required
            disabled={!!editing}
          >
            <option value="">-- Seleccionar Empleado --</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.first_name} {emp.last_name} ({emp.document_number || emp.code})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold">Código del Contrato *</label>
          <Input
            value={data.code}
            onChange={(e) => set("code", e.target.value)}
            placeholder="CTR-1001-EMP01"
            className="text-xs font-mono"
            required
          />
        </div>

        <div>
          <label className="text-xs font-semibold">Tipo de Contrato (Ley Colombiana) *</label>
          <select
            value={data.contract_type_id}
            onChange={(e) => set("contract_type_id", e.target.value)}
            className="w-full p-2 border rounded-md text-xs bg-background"
            required
          >
            {contractTypes.map((ct) => (
              <option key={ct.id} value={ct.id}>
                {ct.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold">Esquema de Jornada *</label>
          <select
            value={data.work_scheme}
            onChange={(e) => set("work_scheme", e.target.value)}
            className="w-full p-2 border rounded-md text-xs bg-background"
          >
            <option value="full_time">Tiempo Completo (47h semanales - Ley 2101)</option>
            <option value="part_time">Medio Tiempo</option>
            <option value="hourly">Por Horas / Turnos</option>
            <option value="specific">Obra o Labor Específica</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold">Fecha de Inicio *</label>
          <Input type="date" value={data.start_date} onChange={(e) => set("start_date", e.target.value)} className="text-xs" required />
        </div>

        <div>
          <label className="text-xs font-semibold">Fecha de Terminación (Vacío = Indefinido)</label>
          <Input type="date" value={data.end_date || ""} onChange={(e) => set("end_date", e.target.value)} className="text-xs" />
        </div>

        <div className="col-span-2 flex items-center gap-3 p-3 bg-amber-50/80 border border-amber-200 rounded-lg dark:bg-amber-950/30 dark:border-amber-800">
          <input
            type="checkbox"
            id="is_renewable_check"
            checked={data.is_renewable !== false}
            onChange={(e) => set("is_renewable", e.target.checked)}
            className="h-4 w-4 rounded border-amber-400 text-blue-600 focus:ring-blue-500 cursor-pointer"
          />
          <label htmlFor="is_renewable_check" className="text-xs font-bold text-slate-800 dark:text-slate-100 cursor-pointer select-none">
            🔄 Renovación Automática del Contrato (Auto-Renovable al Vencer)
            <span className="block text-[11px] font-normal text-slate-600 dark:text-slate-300">
              Si la casilla está chuleada (✓), el contrato se renovará automáticamente al llegar a su fecha de terminación. Si se desmarca (sin chulo), no se renovará automáticamente.
            </span>
          </label>
        </div>

        <div>
          <label className="text-xs font-semibold">Modalidad de Remuneración *</label>
          <select
            value={data.salary_type || "monthly"}
            onChange={(e) => set("salary_type", e.target.value)}
            className="w-full p-2 border rounded-md text-xs bg-background font-semibold"
          >
            <option value="monthly">📅 Salario Mensual Completo</option>
            <option value="hourly">⏱️ Pago por Horas (Valor Hora)</option>
            <option value="per_shift">🔄 Pago por Turno Operativo</option>
            <option value="daily">☀️ Pago por Día / Jornal</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-blue-900 dark:text-blue-300">
            {data.salary_type === "hourly"
              ? "Valor de la Hora Ordinaria Pactada (COP/Hora) *"
              : data.salary_type === "per_shift"
              ? "Valor del Turno Operativo Pactado (COP/Turno) *"
              : data.salary_type === "daily"
              ? "Valor del Día / Jornal Pactado (COP/Día) *"
              : "Salario Mensual Pactado (COP) *"}
          </label>
          <Input type="number" value={data.salary} onChange={(e) => set("salary", e.target.value)} className="text-xs font-mono font-bold border-blue-300" required />
        </div>

        <div>
          <label className="text-xs font-semibold">Frecuencia de Liquidación y Pago *</label>
          <select
            value={data.payment_frequency || "monthly"}
            onChange={(e) => set("payment_frequency", e.target.value)}
            className="w-full p-2 border rounded-md text-xs bg-background font-semibold"
          >
            <option value="daily">☀️ Diario (Al Día)</option>
            <option value="weekly">📅 Semanal (Cada 7 días)</option>
            <option value="biweekly">🗓️ Quincenal (Cada 15 días)</option>
            <option value="monthly">📆 Mensual (Cada 30 días)</option>
          </select>
        </div>
      </div>

      <div className="border-t pt-3 space-y-2">
        <p className="text-xs font-bold text-blue-900 dark:text-blue-300 uppercase">Seguridad Social & Riesgos (Colombia)</p>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-[11px] font-medium">EPS (Salud)</label>
            <select
              value={data.health_provider}
              onChange={(e) => set("health_provider", e.target.value)}
              className="w-full p-2 border rounded-md text-xs bg-background"
            >
              {(catalogs?.eps || DEFAULT_EPS).map((eps: string) => (
                <option key={eps} value={eps}>{eps}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-medium">AFP (Pensión)</label>
            <select
              value={data.pension_provider}
              onChange={(e) => set("pension_provider", e.target.value)}
              className="w-full p-2 border rounded-md text-xs bg-background"
            >
              {(catalogs?.afp || DEFAULT_AFP).map((afp: string) => (
                <option key={afp} value={afp}>{afp}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-medium">ARL (Riesgos Laborales)</label>
            <select
              value={data.arl_provider}
              onChange={(e) => set("arl_provider", e.target.value)}
              className="w-full p-2 border rounded-md text-xs bg-background"
            >
              {(catalogs?.arl || DEFAULT_ARL).map((arl: string) => (
                <option key={arl} value={arl}>{arl}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold">Notas / Observaciones del Contrato</label>
        <Input value={data.notes || ""} onChange={(e) => set("notes", e.target.value)} placeholder="Ej: Contrato renovado..." className="text-xs" />
      </div>
    </div>
  );
}

export default function ContractsPage() {
  const [contracts, setContracts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ ...emptyContract });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [viewOpen, setViewOpen] = useState(false);
  const [viewData, setViewData] = useState<any>(null);
  const [terminateId, setTerminateId] = useState<string | null>(null);
  const [terminateReason, setTerminateReason] = useState("");
  const [employees, setEmployees] = useState<any[]>([]);
  const [contractTypes, setContractTypes] = useState<any[]>(DEFAULT_CONTRACT_TYPES);
  const [typesDialogOpen, setTypesDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<any | null>(null);
  const [newType, setNewType] = useState({ code: "", name: "", labor_law_type: "fixed_term", description: "" });

  const fetchContractTypes = useCallback(async () => {
    try {
      const companyId = localStorage.getItem("company_id") || "dla-company-main";
      const res = await api.get(`/contracts/types?company_id=${companyId}`);
      if (Array.isArray(res.data) && res.data.length > 0) {
        setContractTypes(res.data);
      }
    } catch (err) {
      console.warn("Fallo obteniendo tipos de contrato:", err);
    }
  }, []);

  const handleSaveContractType = async () => {
    if (!newType.name.trim() || !newType.code.trim()) return;
    try {
      const companyId = localStorage.getItem("company_id") || "dla-company-main";
      if (editingType) {
        await api.put(`/contracts/types/${editingType.id}`, { ...newType, company_id: companyId });
        showToast("success", "Tipo de contrato actualizado correctamente");
      } else {
        await api.post("/contracts/types", { ...newType, company_id: companyId });
        showToast("success", "Tipo de contrato creado correctamente");
      }
      setEditingType(null);
      setNewType({ code: "", name: "", labor_law_type: "fixed_term", description: "" });
      fetchContractTypes();
    } catch (err: any) {
      showToast("error", err?.response?.data?.detail || "Error al guardar tipo de contrato");
    }
  };

  const handleDeleteContractType = async (typeId: string) => {
    try {
      await api.delete(`/contracts/types/${typeId}`);
      showToast("success", "Tipo de contrato inactivado correctamente");
      fetchContractTypes();
    } catch (err: any) {
      showToast("error", err?.response?.data?.detail || "Error al eliminar tipo de contrato");
    }
  };

  // Document Upload State for Contracts
  const [docsDialogOpen, setDocsDialogOpen] = useState<boolean>(false);
  const [docsContractData, setDocsContractData] = useState<any>(null);
  const [docName, setDocName] = useState<string>("");
  const [docType, setDocType] = useState<string>("pdf");
  const [docFileBase64, setDocFileBase64] = useState<string | null>(null);
  const [docFileSize, setDocFileSize] = useState<number>(0);
  const [uploadingDoc, setUploadingDoc] = useState<boolean>(false);

  // Digital Signature State for Contracts
  const [signatureModalOpen, setSignatureModalOpen] = useState<boolean>(false);
  const [signTargetContract, setSignTargetContract] = useState<any | null>(null);

  const openSignatureModal = (contract: any) => {
    setSignTargetContract(contract);
    setSignatureModalOpen(true);
  };

  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await api.get("/employees?page_size=100");
      const list = res.data?.items || res.data || [];
      setEmployees(Array.isArray(list) ? list : []);
    } catch (err) {
      console.warn("Fallo obteniendo empleados:", err);
      // Fallback try without page_size if query param fails
      try {
        const res2 = await api.get("/employees");
        const list2 = res2.data?.items || res2.data || [];
        setEmployees(Array.isArray(list2) ? list2 : []);
      } catch {}
    }
  }, []);

  const fetchContracts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/contracts");
      setContracts(res.data.items || res.data || []);
      setTotal(res.data.total || (res.data.items || []).length);
    } catch (err) {
      console.warn("Fallo cargando contratos:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
    fetchContracts();
    fetchContractTypes();
  }, [fetchEmployees, fetchContracts, fetchContractTypes]);

  const openNew = () => {
    fetchEmployees();
    setEditMode(false);
    setEditId(null);
    setFormData({ ...emptyContract });
    setError("");
    setDialogOpen(true);
  };

  const openEdit = (contract: any) => {
    setEditMode(true);
    setEditId(contract.id);
    setFormData({
      employee_id: contract.employee_id || "",
      company_id: contract.company_id || "",
      contract_type_id: contract.contract_type_id || "ct-01",
      code: contract.code || "",
      start_date: contract.start_date || "",
      end_date: contract.end_date || "",
      salary: String(contract.salary || "1423500"),
      work_scheme: contract.work_scheme || "full_time",
      weekly_hours: contract.weekly_hours || 48,
      daily_hours: contract.daily_hours || 8,
      payment_frequency: contract.payment_frequency || "monthly",
      transportation_assistance: contract.transportation_assistance ?? true,
      health_provider: contract.health_provider || "EPS Sura",
      pension_provider: contract.pension_provider || "Porvenir S.A.",
      arl_provider: contract.arl_provider || "Positiva Compañía de Seguros (ARL Positiva)",
      risk_level: contract.risk_level || "1",
      notes: contract.notes || "",
    });
    setError("");
    setDialogOpen(true);
  };

  const openView = async (contract: any) => {
    try {
      const res = await api.get(`/contracts/${contract.id}`);
      setViewData(res.data);
    } catch {
      setViewData(contract);
    }
    setViewOpen(true);
  };

  // Document Management Modal Open
  const openDocsModal = async (contract: any) => {
    try {
      const res = await api.get(`/contracts/${contract.id}`);
      setDocsContractData(res.data);
    } catch {
      setDocsContractData(contract);
    }
    setDocName("");
    setDocType("pdf");
    setDocFileBase64(null);
    setDocsDialogOpen(true);
  };

  // Handle File Upload Input Change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDocFileSize(file.size);
    if (!docName) {
      setDocName(file.name.replace(/\.[^/.]+$/, ""));
    }
    const reader = new FileReader();
    reader.onload = (evt) => {
      setDocFileBase64(evt.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Upload Document Handler
  const handleSaveDocument = async () => {
    if (!docsContractData || !docFileBase64 || !docName.trim()) return;
    setUploadingDoc(true);
    try {
      await api.post(`/contracts/${docsContractData.id}/documents`, {
        name: docName.trim(),
        doc_type: docType,
        file_base64: docFileBase64,
        file_size_bytes: docFileSize,
      });
      showToast("success", "Documento adjuntado exitosamente al contrato");
      const res = await api.get(`/contracts/${docsContractData.id}`);
      setDocsContractData(res.data);
      setDocName("");
      setDocFileBase64(null);
      fetchContracts();
    } catch (err: any) {
      showToast("error", err?.response?.data?.detail || "Error al subir documento");
    } finally {
      setUploadingDoc(false);
    }
  };

  // Delete Document Handler
  const handleDeleteDocument = async (docId: string) => {
    if (!docsContractData) return;
    try {
      await api.delete(`/contracts/${docsContractData.id}/documents/${docId}`);
      showToast("success", "Documento eliminado");
      const res = await api.get(`/contracts/${docsContractData.id}`);
      setDocsContractData(res.data);
      fetchContracts();
    } catch {
      showToast("error", "Error al eliminar el documento");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      if (editMode && editId) {
        const res = await api.put(`/contracts/${editId}`, {
          ...formData,
          salary: parseFloat(formData.salary),
        });
        showToast("success", "Contrato actualizado con éxito");
        if (res.data && res.data.id) {
          setContracts((prev) => prev.map((c) => (c.id === editId ? { ...c, ...res.data } : c)));
        }
      } else {
        const res = await api.post("/contracts", {
          ...formData,
          salary: parseFloat(formData.salary),
        });
        showToast("success", "Contrato registrado con éxito");
        if (res.data && res.data.id) {
          setContracts((prev) => [res.data, ...prev.filter((c) => c.id !== res.data.id)]);
        }
      }
      setDialogOpen(false);
      await fetchContracts();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Error al guardar el contrato");
    } finally {
      setSaving(false);
    }
  };

  const handleTerminate = async () => {
    if (!terminateId) return;
    try {
      await api.post(`/contracts/${terminateId}/terminate`, { reason: terminateReason });
      showToast("success", "Contrato terminado con éxito");
      setTerminateId(null);
      fetchContracts();
    } catch (err: any) {
      showToast("error", err?.response?.data?.detail || "Error al terminar el contrato");
    }
  };

  return (
    <div className="space-y-4 p-2 sm:p-4">
      {/* Toast Notification */}
      {toast && (
        <div className={`p-3 rounded-lg text-white text-xs font-bold shadow-lg flex items-center gap-2 ${toast.type === "success" ? "bg-emerald-600" : "bg-rose-600"}`}>
          {toast.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contratos Laborales</h1>
          <p className="text-xs text-muted-foreground">Gestión de vinculaciones contractuales, documentos adjuntos y seguridad social</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => { fetchContractTypes(); setTypesDialogOpen(true); }} className="text-xs font-bold gap-1 border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100">
            <Settings className="h-4 w-4" /> Configurar Tipos de Contrato
          </Button>
          <Button size="sm" onClick={openNew} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1">
            <Plus className="h-4 w-4" /> Nuevo Contrato
          </Button>
        </div>
      </div>

      {/* Table Card */}
      <Card className="border shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Empleado</TableHead>
                <TableHead>Tipo de Contrato</TableHead>
                <TableHead>Inicio</TableHead>
                <TableHead>Fin</TableHead>
                <TableHead>Salario</TableHead>
                <TableHead>Documentos Legales</TableHead>
                <TableHead>Firma Digital</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">Cargando contratos...</TableCell></TableRow>
              ) : contracts.length === 0 ? (
                <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">No hay contratos registrados</TableCell></TableRow>
              ) : (
                contracts.map((c) => {
                  const typeObj = contractTypes.find((ct) => ct.id === c.contract_type_id);
                  const docCount = c.documents?.length || 0;
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono text-xs font-bold">{c.code}</TableCell>
                      <TableCell className="font-medium text-xs">{c.employee_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[11px] bg-blue-50 text-blue-800 border-blue-200">
                          {typeObj?.name || c.contract_type_id}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-semibold">
                        {c.start_date || "—"}
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold">{c.end_date || "Indefinido"}</span>
                          {c.end_date && (
                            c.is_renewable !== false ? (
                              <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-0.5">
                                🔄 Auto-Renovable
                              </span>
                            ) : (
                              <span className="text-[10px] text-red-600 font-semibold flex items-center gap-0.5">
                                🛑 No Renovable
                              </span>
                            )
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <span className="font-bold text-emerald-700 block">
                          ${Number(c.salary).toLocaleString("es-CO")}
                          {c.salary_type === "hourly" ? "/Hora" : c.salary_type === "per_shift" ? "/Turno" : c.salary_type === "daily" ? "/Día" : ""}
                        </span>
                        <span className="text-[10px] text-muted-foreground capitalize">
                          {c.payment_frequency === "daily" ? "☀️ Diario" : c.payment_frequency === "weekly" ? "📅 Semanal" : c.payment_frequency === "biweekly" ? "🗓️ Quincenal" : "📆 Mensual"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openDocsModal(c)}
                          className="h-7 text-[11px] gap-1 border-blue-300 bg-blue-50 text-blue-900 hover:bg-blue-100 font-semibold"
                        >
                          <FileText className="h-3 w-3" /> ({docCount}) Adjuntos
                        </Button>
                      </TableCell>
                      <TableCell>
                        {c.is_signed || c.signature_url ? (
                          <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] gap-1 cursor-pointer" onClick={() => openSignatureModal(c)}>
                            <CheckCircle2 className="h-3 w-3" /> Firmado
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openSignatureModal(c)}
                            className="h-7 text-[10px] gap-1 border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 font-bold"
                          >
                            <ShieldCheck className="h-3 w-3 text-amber-600" /> Firmar
                          </Button>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={c.status === "active" ? "default" : "destructive"}>
                          {c.status === "active" ? "Activo" : "Terminado"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button variant="ghost" size="sm" onClick={() => openView(c)}><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(c)} disabled={c.status !== "active"}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => { setTerminateId(c.id); setTerminateReason(""); }} disabled={c.status !== "active"}><Ban className="h-4 w-4 text-red-500" /></Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Diálogo Crear/Editar Contrato */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editMode ? "Editar Contrato Laboral" : "Nuevo Contrato Laboral (Colombia)"}</DialogTitle>
          </DialogHeader>

          {error && <div className="p-2.5 bg-red-50 text-red-700 border border-red-200 text-xs rounded">{error}</div>}

          <ContractForm
            data={formData}
            onChange={setFormData}
            employees={employees}
            contractTypes={contractTypes}
            editing={editMode}
          />

          <DialogFooter>
            <DialogClose asChild><Button variant="outline" size="sm">Cancelar</Button></DialogClose>
            <Button size="sm" onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
              {saving ? "Guardando..." : "Guardar Contrato"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO GESTIÓN DE DOCUMENTOS DEL CONTRATO / EMPLEADO */}
      <Dialog open={docsDialogOpen} onOpenChange={setDocsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" /> Documentación del Empleado y Contrato
            </DialogTitle>
          </DialogHeader>

          {docsContractData && (
            <div className="space-y-4 py-1 text-xs">
              <div className="bg-blue-50 dark:bg-blue-950/40 p-3 rounded-xl border border-blue-200 dark:border-blue-800 space-y-1">
                <p className="font-bold text-blue-950 dark:text-blue-200">
                  Contrato: {docsContractData.code} - {docsContractData.employee_name}
                </p>
                <p className="text-muted-foreground text-[11px]">
                  Cargue aquí la documentación probatoria del empleado (Certificados de estudios, Cédula, Exámenes médicos, Contrato firmado).
                </p>
              </div>

              {/* Formulario Cargar Documento */}
              <div className="p-3 bg-slate-50 dark:bg-slate-900 border rounded-xl space-y-3">
                <p className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                  <Upload className="h-4 w-4 text-blue-600" /> Adjuntar Nuevo Documento (PDF / Imagen)
                </p>

                <div className="space-y-2">
                  <div>
                    <label className="text-[11px] font-semibold">Nombre / Descripción del Documento *</label>
                    <Input
                      placeholder="Ej: Certificado de Bachiller / Cédula / Examen Médico"
                      value={docName}
                      onChange={(e) => setDocName(e.target.value)}
                      className="text-xs bg-white dark:bg-slate-950"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-semibold">Tipo de Documento</label>
                      <select
                        value={docType}
                        onChange={(e) => setDocType(e.target.value)}
                        className="w-full p-2 border rounded-lg text-xs bg-white dark:bg-slate-950"
                      >
                        <option value="pdf">Documento PDF</option>
                        <option value="certificate">Certificación Académica / Estudios</option>
                        <option value="id_card">Cédula / Documento de Identidad</option>
                        <option value="medical">Examen Médico de Ingreso</option>
                        <option value="image">Fotografía / Escáner</option>
                        <option value="other">Otro Documento</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold">Seleccionar Archivo *</label>
                      <Input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={handleFileChange}
                        className="text-xs bg-white dark:bg-slate-950"
                      />
                    </div>
                  </div>

                  <Button
                    size="sm"
                    onClick={handleSaveDocument}
                    disabled={uploadingDoc || !docFileBase64 || !docName.trim()}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs mt-1"
                  >
                    {uploadingDoc ? "Subiendo Documento..." : "Cargar y Guardar Documento"}
                  </Button>
                </div>
              </div>

              {/* Listado de Documentos Cargados */}
              <div className="space-y-2">
                <p className="font-bold text-gray-900 dark:text-white">Documentos Registrados ({docsContractData.documents?.length || 0})</p>

                {!docsContractData.documents || docsContractData.documents.length === 0 ? (
                  <p className="text-center py-4 text-muted-foreground text-xs italic">
                    No se han cargado documentos para este contrato.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {docsContractData.documents.map((doc: any) => (
                      <div key={doc.id} className="p-3 bg-card border rounded-lg flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 dark:text-white">{doc.name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {doc.doc_type} | Cargado: {doc.uploaded_at || "Reciente"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          {doc.file_base64 && (
                            <a
                              href={doc.file_base64}
                              target="_blank"
                              rel="noreferrer"
                              download={`${doc.name}.pdf`}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                              title="Ver / Descargar"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteDocument(doc.id)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg h-7 w-7"
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <DialogClose asChild><Button variant="outline" size="sm">Cerrar</Button></DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo Ver Detalle */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Detalle del Contrato Laboral</DialogTitle></DialogHeader>
          {viewData && (
            <div className="space-y-3 text-sm">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                <p className="text-xs text-blue-600 uppercase font-semibold">Código del Contrato</p>
                <p className="text-lg font-bold font-mono text-blue-950">{viewData.code}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div><span className="text-muted-foreground">Empleado:</span> <span className="font-medium">{viewData.employee_name}</span></div>
                <div><span className="text-muted-foreground">Estado:</span> <Badge variant={viewData.status === "active" ? "default" : "destructive"}>{viewData.status === "active" ? "Activo" : "Terminado"}</Badge></div>
                <div><span className="text-muted-foreground">Fecha Inicio:</span> {viewData.start_date}</div>
                <div><span className="text-muted-foreground">Fecha Fin:</span> {viewData.end_date || "Indefinido"}</div>
                <div>
                  <span className="text-muted-foreground">Auto-Renovable:</span>{" "}
                  <Badge variant={viewData.is_renewable !== false ? "default" : "secondary"} className="text-[10px]">
                    {viewData.is_renewable !== false ? "Sí (Renovación Automática)" : "No (Vence sin Renovar)"}
                  </Badge>
                </div>
                <div><span className="text-muted-foreground">Salario Base:</span> <span className="font-semibold text-green-700">${Number(viewData.salary).toLocaleString("es-CO")}</span></div>
                <div><span className="text-muted-foreground">EPS:</span> {viewData.health_provider || "—"}</div>
                <div><span className="text-muted-foreground">AFP:</span> {viewData.pension_provider || "—"}</div>
                <div><span className="text-muted-foreground">ARL:</span> {viewData.arl_provider || "—"}</div>
                <div className="col-span-2"><span className="text-muted-foreground">Documentos Adjuntos:</span> {viewData.documents?.length || 0} archivos registrados</div>
                
                {viewData.signature_url && (
                  <div className="col-span-2 p-3 bg-slate-50 border rounded-lg text-center space-y-1">
                    <p className="text-[10px] text-muted-foreground font-bold uppercase">Firma Digital Registrada</p>
                    <img src={viewData.signature_url} alt="Firma Registrada" className="h-16 mx-auto bg-white p-1 rounded border object-contain" />
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            {viewData && (
              <Button
                size="sm"
                onClick={() => { setViewOpen(false); openSignatureModal(viewData); }}
                className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs gap-1"
              >
                <ShieldCheck className="h-4 w-4" /> {viewData.is_signed || viewData.signature_url ? "Actualizar Firma" : "Firmar Digitalmente"}
              </Button>
            )}
            <DialogClose asChild><Button variant="outline" size="sm">Cerrar</Button></DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Firma Digital (Pantalla, Imagen, Código QR) */}
      <DigitalSignatureModal
        open={signatureModalOpen}
        onOpenChange={setSignatureModalOpen}
        contractId={signTargetContract?.id}
        employeeName={signTargetContract?.employee_name}
        onSignatureSaved={() => {
          showToast("success", "Firma digital guardada e integrada exitosamente");
          fetchContracts();
        }}
      />

      {/* Diálogo Configurar Tipos de Contrato */}
      <Dialog open={typesDialogOpen} onOpenChange={setTypesDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Settings className="h-5 w-5 text-blue-600" /> Configuración de Tipos de Contrato Laboral
            </DialogTitle>
            <DialogDescription className="text-xs">
              Administre las modalidades de vinculación legal (Término Fijo, Indefinido, Obra o Labor, Prestación de Servicios, etc.).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-xs">
            {/* Formulario Crear/Editar Tipo de Contrato */}
            <div className="p-3 bg-slate-50 dark:bg-slate-900 border rounded-xl space-y-3">
              <p className="font-bold text-gray-900 dark:text-white">
                {editingType ? `Editar Tipo de Contrato (${editingType.code})` : "Crear Nuevo Tipo de Contrato"}
              </p>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[11px] font-medium">Código *</label>
                  <Input
                    placeholder="Ej: TF-COL"
                    value={newType.code}
                    onChange={(e) => setNewType({ ...newType, code: e.target.value })}
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-[11px] font-medium">Nombre Completo *</label>
                  <Input
                    placeholder="Ej: Contrato a Término Fijo (Art. 46 CST)"
                    value={newType.name}
                    onChange={(e) => setNewType({ ...newType, name: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-[11px] font-medium">Tipo Legal Ley Colombiana (CST)</label>
                  <select
                    value={newType.labor_law_type}
                    onChange={(e) => setNewType({ ...newType, labor_law_type: e.target.value })}
                    className="w-full h-8 rounded-md border bg-background px-2 text-xs"
                  >
                    <option value="fixed_term">Término Fijo (Art. 46 CST)</option>
                    <option value="indefinite">Término Indefinido (Art. 47 CST)</option>
                    <option value="specific_work">Obra o Labor (Art. 45 CST)</option>
                    <option value="services">Prestación de Servicios (Civil/Comercial)</option>
                    <option value="apprenticeship">Aprendizaje SENA (Ley 789/2002)</option>
                    <option value="transitory">Ocasional o Transitorio (Art. 6 CST)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-medium">Descripción</label>
                  <Input
                    placeholder="Notas o parámetros"
                    value={newType.description}
                    onChange={(e) => setNewType({ ...newType, description: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                {editingType && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setEditingType(null); setNewType({ code: "", name: "", labor_law_type: "fixed_term", description: "" }); }}
                    className="h-7 text-xs"
                  >
                    Cancelar Edición
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={handleSaveContractType}
                  disabled={!newType.code.trim() || !newType.name.trim()}
                  className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold"
                >
                  {editingType ? "Guardar Cambios" : "Agregar Tipo de Contrato"}
                </Button>
              </div>
            </div>

            {/* Listado de Tipos Registrados */}
            <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Código</TableHead>
                    <TableHead className="text-xs">Nombre del Tipo</TableHead>
                    <TableHead className="text-xs">Tipo CST</TableHead>
                    <TableHead className="text-xs text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contractTypes.map((ct) => (
                    <TableRow key={ct.id || ct.code}>
                      <TableCell className="font-mono font-bold text-xs">{ct.code}</TableCell>
                      <TableCell className="font-medium text-xs">{ct.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {ct.labor_law_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => { setEditingType(ct); setNewType({ code: ct.code, name: ct.name, labor_law_type: ct.labor_law_type || "fixed_term", description: ct.description || "" }); }}
                          className="h-6 w-6 p-0"
                          title="Editar Tipo de Contrato"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteContractType(ct.id)}
                          className="h-6 w-6 p-0 text-rose-600"
                          title="Inactivar / Eliminar"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild><Button variant="outline" size="sm">Cerrar</Button></DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
