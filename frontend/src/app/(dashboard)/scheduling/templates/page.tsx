"use client";
import React, { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Plus, Clock, Pencil, Trash2, Loader2 } from "lucide-react";

const shiftTypes = [
  { value: "regular", label: "Regular" },
  { value: "morning", label: "Mañana" },
  { value: "afternoon", label: "Tarde" },
  { value: "night", label: "Noche" },
  { value: "home_visit", label: "Visita Domiciliaria" },
  { value: "therapy", label: "Terapia" },
  { value: "followup", label: "Control" },
  { value: "special", label: "Especial" },
];

const emptyForm = { name: "", color: "#3b82f6", start_time: "07:00", end_time: "15:00", duration_hours: "8", shift_type: "regular", observations: "" };

function calcDuration(start: string, end: string): string {
  try {
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    const mins = (eh * 60 + em) - (sh * 60 + sm);
    if (mins <= 0) return "0";
    return (mins / 60).toFixed(1);
  } catch (e: any) { console.error("Duration calc error:", e); return "0"; }
}

export default function ShiftTemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const companyId = localStorage.getItem("company_id") || "";
      const res = await api.get(`/scheduling/templates?company_id=${companyId}`);
      setTemplates(res.data.items || []);
    } catch (e: any) { console.error("Templates loadData error:", e); }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const dur = calcDuration(form.start_time, form.end_time);
    setForm((prev) => ({ ...prev, duration_hours: dur }));
  }, [form.start_time, form.end_time]);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (t: any) => {
    setEditing(t);
    setForm({ name: t.name, color: t.color || "#3b82f6", start_time: t.start_time, end_time: t.end_time, duration_hours: String(t.duration_hours), shift_type: t.shift_type || "regular", observations: t.observations || "" });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.start_time || !form.end_time) return;
    setSaving(true);
    try {
      const companyId = localStorage.getItem("company_id") || "dla-company-main";
      const payload = { ...form, company_id: companyId, duration_hours: parseFloat(form.duration_hours) };
      if (editing) {
        const res = await api.put(`/scheduling/templates/${editing.id}`, payload);
        if (res.data && res.data.id) {
          setTemplates((prev) => prev.map((t) => (t.id === editing.id ? { ...t, ...res.data } : t)));
        }
      } else {
        const res = await api.post("/scheduling/templates", payload);
        if (res.data && res.data.id) {
          setTemplates((prev) => [res.data, ...prev.filter((t) => t.id !== res.data.id)]);
        }
      }
      setDialogOpen(false);
      await loadData();
    } catch (e: any) { alert("Error al guardar plantilla: " + (e?.response?.data?.detail || e?.message || "Error desconocido")); }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try { await api.delete(`/scheduling/templates/${deleteTarget.id}`); setDeleteTarget(null); await loadData(); } catch (e: any) { alert("Error al eliminar plantilla: " + (e?.response?.data?.detail || e?.message || "Error desconocido")); }
    setDeleting(false);
  };

  const typeLabels: Record<string, string> = Object.fromEntries(shiftTypes.map((t) => [t.value, t.label]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Plantillas de Turnos</h1>
          <p className="text-xs text-muted-foreground">Catálogo reutilizable de turnos para programación</p>
        </div>
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Nueva Plantilla</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Turnos Disponibles</CardTitle>
          <CardDescription>Los turnos se usan como plantillas al crear eventos de programación</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Color</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Horario</TableHead>
                <TableHead>Duración</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8">Cargando...</TableCell></TableRow>
              ) : templates.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No hay plantillas. Cree una para comenzar a programar.</TableCell></TableRow>
              ) : (
                templates.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell><div className="w-4 h-4 rounded-full" style={{ backgroundColor: t.color }} /></TableCell>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell className="font-mono text-sm">{t.start_time} - {t.end_time}</TableCell>
                    <TableCell>{t.duration_hours}h</TableCell>
                    <TableCell><Badge variant="outline">{typeLabels[t.shift_type] || t.shift_type}</Badge></TableCell>
                    <TableCell><Badge variant={t.status === "active" ? "success" : "secondary"}>{t.status === "active" ? "Activa" : "Inactiva"}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(t)}><Pencil className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(t)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Plantilla" : "Nueva Plantilla de Turno"}</DialogTitle>
            <DialogDescription>{editing ? "Actualizar datos de la plantilla" : "Crear una plantilla reutilizable para programación"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nombre *</label>
              <Input placeholder="Turno Mañana" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Color</label>
              <div className="flex items-center gap-3">
                <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="w-10 h-10 rounded border cursor-pointer" />
                <Input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="w-32 font-mono" />
                <div className="flex gap-1">
                  {["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"].map((c) => (
                    <div key={c} onClick={() => setForm({ ...form, color: c })} className="w-6 h-6 rounded-full cursor-pointer border-2 hover:scale-110 transition-transform" style={{ backgroundColor: c, borderColor: form.color === c ? "#000" : "transparent" }} />
                  ))}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Hora Inicio *</label>
                <Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Hora Fin *</label>
                <Input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Duración</label>
                <Input value={`${form.duration_hours}h`} disabled className="bg-muted" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de Turno</label>
              <select className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm" value={form.shift_type} onChange={(e) => setForm({ ...form, shift_type: e.target.value })}>
                {shiftTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Observaciones</label>
              <textarea className="flex min-h-[60px] w-full rounded-md border bg-background px-3 py-2 text-sm" value={form.observations} onChange={(e) => setForm({ ...form, observations: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !form.name || !form.start_time || !form.end_time}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}{editing ? "Actualizar" : "Crear Plantilla"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Plantilla</DialogTitle>
            <DialogDescription>¿Eliminar la plantilla <strong>{deleteTarget?.name}</strong>?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>{deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
