"use client";
import React, { useEffect, useState, useCallback, useMemo } from "react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Plus, Save, AlertTriangle, Calendar, Clock, Users, Trash2, Loader2, ChevronLeft, ChevronRight, GripVertical, Copy, X, CheckCircle, AlertCircle, Pencil } from "lucide-react";
import { toLocalDateStr } from "@/lib/utils";

type ViewMode = "day" | "week" | "month" | "agenda";

interface PendingEvent {
  id: string;
  employee_id: string;
  employee_name: string;
  client_id: string;
  client_name: string;
  persona_id: string;
  persona_name: string;
  project_id: string;
  shift_template_id: string;
  name: string;
  color: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  priority: string;
  observations: string;
  isClone?: boolean;
  original_id?: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  employee_id: string;
  employee_name: string;
  client_name: string;
  persona_name: string;
  status: string;
  color: string;
  start_time: string;
  end_time: string;
  shift_date: string;
}

interface Toast {
  id: string;
  message: string;
  type: "error" | "success" | "warning";
}

const daysOfWeek = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

function uid(): string { return Math.random().toString(36).slice(2, 10); }

function isDateOrTimePast(dateStr: string, timeStr?: string): { isPast: boolean; message: string } {
  if (!dateStr) return { isPast: false, message: "" };
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;

  if (dateStr < todayStr) {
    return {
      isPast: true,
      message: `La fecha ${dateStr} ya transcurrió. Solo se permite programar desde hoy (${todayStr}) en adelante.`
    };
  }

  if (dateStr === todayStr && timeStr) {
    const [sh, sm] = timeStr.split(":").slice(0, 2).map(Number);
    const selectedMinutes = sh * 60 + sm;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    if (selectedMinutes < currentMinutes) {
      const nowFormatted = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return {
        isPast: true,
        message: `La hora ${timeStr} del día de hoy ya transcurrió. La hora actual del servidor es ${nowFormatted}. Debe seleccionar una hora igual o posterior.`
      };
    }
  }

  return { isPast: false, message: "" };
}

function isDatePast(dateStr: string): boolean {
  return isDateOrTimePast(dateStr).isPast;
}

function timesOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
  return !(end1 <= start2 || start1 >= end2);
}

function findConflictsForEmployee(
  employeeId: string,
  shiftDate: string,
  startTime: string,
  endTime: string,
  existingShifts: CalendarEvent[],
  pendingEvents: PendingEvent[],
  excludePendingId?: string,
): { source: string; detail: string }[] {
  if (!employeeId) return [];
  const conflicts: { source: string; detail: string }[] = [];
  for (const s of existingShifts) {
    if (s.employee_id !== employeeId || s.shift_date !== shiftDate) continue;
    if (s.status === "cancelled") continue;
    if (timesOverlap(startTime, endTime, s.start_time, s.end_time)) {
      conflicts.push({ source: "calendar", detail: `Turno existente: ${s.start_time}-${s.end_time} (${s.employee_name || s.title})` });
    }
  }
  for (const p of pendingEvents) {
    if (p.id === excludePendingId) continue;
    if (p.employee_id !== employeeId || p.shift_date !== shiftDate) continue;
    if (timesOverlap(startTime, endTime, p.start_time, p.end_time)) {
      conflicts.push({ source: "pending", detail: `Evento pendiente: ${p.start_time}-${p.end_time} (${p.employee_name || p.name})` });
    }
  }
  return conflicts;
}

import { useRouter } from "next/navigation";

export default function SchedulingPage() {
  const router = useRouter();
  const [view, setView] = useState<ViewMode>("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [templates, setTemplates] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [personas, setPersonas] = useState<any[]>([]);
  const [existingShifts, setExistingShifts] = useState<CalendarEvent[]>([]);
  const [pendingEvents, setPendingEvents] = useState<PendingEvent[]>([]);
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({
    employee_id: "", client_id: "", persona_id: "", project_id: "",
    shift_template_id: "", name: "", color: "#3b82f6", shift_date: "",
    start_time: "08:00", end_time: "17:00", break_minutes: "0", priority: "normal", observations: "",
    recurrence_type: "none", recurrence_days: "", recurrence_end_date: "", max_occurrences: "",
  });
  const [editEvent, setEditEvent] = useState<PendingEvent | null>(null);
  const [editingExistingShift, setEditingExistingShift] = useState<any>(null);
  const [savingShift, setSavingShift] = useState(false);
  const [dragSource, setDragSource] = useState<{ type: "template" | "pending"; id: string } | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [series, setSeries] = useState<any[]>([]);
  const [seriesOpen, setSeriesOpen] = useState(false);
  const [seriesForm, setSeriesForm] = useState({
    name: "", employee_id: "", client_id: "", persona_id: "", shift_template_id: "",
    recurrence_type: "weekly", recurrence_days: "1,2,3,4,5",
    start_date: "", end_date: "", max_occurrences: "",
    default_start_time: "08:00", default_end_time: "17:00", default_break_minutes: "60",
    default_priority: "normal", default_notes: "", color: "#3b82f6",
  });
  const [generating, setGenerating] = useState<string | null>(null);
  const [cancellingShift, setCancellingShift] = useState(false);
  const [deletingShift, setDeletingShift] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [creatingTemplate, setCreatingTemplate] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any | null>(null);
  const [templateForm, setTemplateForm] = useState({ name: "", color: "#3b82f6", start_time: "08:00", end_time: "17:00", shift_type: "regular", observations: "" });
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const todayStr = toLocalDateStr();

  const filteredClients = useMemo(() => {
    if (!clientSearchQuery.trim()) return clients;
    const q = clientSearchQuery.toLowerCase();
    return clients.filter((c) => (c.name || "").toLowerCase().includes(q) || (c.nit || "").toLowerCase().includes(q) || (c.city || "").toLowerCase().includes(q));
  }, [clients, clientSearchQuery]);

  const addToast = useCallback((message: string, type: Toast["type"] = "error") => {
    const id = uid();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const loadData = useCallback(async () => {
    try {
      const companyId = (typeof window !== "undefined" ? localStorage.getItem("company_id") : null) || "dla-company-main";
      const [tRes, eRes, cRes] = await Promise.allSettled([
        api.get(`/scheduling/templates?company_id=${companyId}`),
        api.get(`/employees?company_id=${companyId}&page_size=1000`),
        api.get(`/clients?company_id=${companyId}&page_size=1000`),
      ]);
      if (tRes.status === "fulfilled") setTemplates(tRes.value.data.items || tRes.value.data || []);
      if (eRes.status === "fulfilled") setEmployees(eRes.value.data.items || eRes.value.data || []);
      if (cRes.status === "fulfilled") setClients(cRes.value.data.items || cRes.value.data || []);
    } catch (e) { console.error("Failed to load scheduling data:", e); }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const loadSeries = useCallback(async () => {
    try {
      const companyId = (typeof window !== "undefined" ? localStorage.getItem("company_id") : null) || "dla-company-main";
      const res = await api.get(`/scheduling/series?company_id=${companyId}&page_size=1000`);
      setSeries(res.data.items || res.data || []);
    } catch (e) { console.error("Failed to load series:", e); }
  }, []);

  useEffect(() => { loadSeries(); }, [loadSeries]);

  useEffect(() => {
    if (!form.client_id) { setPersonas([]); return; }
    api.get(`/clients/${form.client_id}/personas`).then((r) => setPersonas(r.data.items || r.data || [])).catch(() => setPersonas([]));
  }, [form.client_id]);

  const loadCalendar = useCallback(async () => {
    try {
      const companyId = localStorage.getItem("company_id") || "";
      const { start, end } = getDateRange();
      const res = await api.get(`/scheduling/calendar?company_id=${companyId}&start_date=${start}&end_date=${end}`);
      setExistingShifts((res.data || []).map((s: any) => ({
        id: s.id, title: s.title || s.name, start: s.start, end: s.end,
        employee_id: s.employee_id, employee_name: s.employee_name || "",
        client_name: s.client_name || "", persona_name: s.persona_name || "",
        status: s.status, color: s.color || "#3b82f6",
        start_time: s.start?.split("T")[1]?.slice(0, 5) || "",
        end_time: s.end?.split("T")[1]?.slice(0, 5) || "",
        shift_date: s.start?.split("T")[0] || "",
      })));
    } catch (e) { console.error("Failed to load calendar:", e); addToast("Error al cargar calendario", "error"); }
  }, [currentDate, view]);

  useEffect(() => { loadCalendar(); }, [loadCalendar]);

  const getDateRange = useCallback(() => {
    const d = currentDate;
    if (view === "day") {
      const ds = toLocalDateStr(d);
      return { start: ds, end: ds };
    }
    if (view === "week") {
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d); monday.setDate(diff);
      const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
      return { start: toLocalDateStr(monday), end: toLocalDateStr(sunday) };
    }
    const first = new Date(d.getFullYear(), d.getMonth(), 1);
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return { start: toLocalDateStr(first), end: toLocalDateStr(last) };
  }, [currentDate, view]);

  useEffect(() => {
    if (form.shift_template_id) {
      const t = templates.find((t) => t.id === form.shift_template_id);
      if (t) setForm((prev) => ({ ...prev, name: t.name, color: t.color, start_time: t.start_time, end_time: t.end_time, break_minutes: String(60) }));
    }
  }, [form.shift_template_id, templates]);

  const openEditTemplate = (t: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingTemplate(t);
    setTemplateForm({
      name: t.name || "",
      color: t.color || "#3b82f6",
      start_time: t.start_time || "08:00",
      end_time: t.end_time || "17:00",
      shift_type: t.shift_type || "regular",
      observations: t.observations || "",
    });
    setTemplateDialogOpen(true);
  };

  const handleDeleteTemplate = async (t: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`¿Está seguro de eliminar la plantilla "${t.name}"?`)) return;
    try {
      await api.delete(`/scheduling/templates/${t.id}`);
      addToast(`Plantilla "${t.name}" eliminada correctamente`, "success");
      loadData();
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      const errMsg = typeof detail === "string" ? detail : "No fue posible eliminar la plantilla.";
      addToast(errMsg, "error");
    }
  };

  const handleSaveTemplate = async () => {
    if (!templateForm.name || !templateForm.start_time || !templateForm.end_time) return;
    setCreatingTemplate(true);
    try {
      const companyId = localStorage.getItem("company_id") || "dla-company-main";
      const [sh, sm] = templateForm.start_time.split(":").map(Number);
      const [eh, em] = templateForm.end_time.split(":").map(Number);
      const durationHours = Math.max(((eh * 60 + em) - (sh * 60 + sm)) / 60, 0.5);
      const payload = {
        company_id: companyId,
        name: templateForm.name,
        color: templateForm.color,
        start_time: templateForm.start_time,
        end_time: templateForm.end_time,
        duration_hours: durationHours,
        shift_type: templateForm.shift_type,
        observations: templateForm.observations || null,
      };

      if (editingTemplate) {
        await api.put(`/scheduling/templates/${editingTemplate.id}`, payload);
        addToast(`Plantilla "${templateForm.name}" actualizada correctamente`, "success");
      } else {
        await api.post("/scheduling/templates", payload);
        addToast(`Plantilla "${templateForm.name}" creada correctamente`, "success");
      }

      setTemplateDialogOpen(false);
      setEditingTemplate(null);
      setTemplateForm({ name: "", color: "#3b82f6", start_time: "08:00", end_time: "17:00", shift_type: "regular", observations: "" });
      loadData();
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      const errMsg = typeof detail === "string" ? detail : "Error al guardar plantilla";
      addToast(errMsg, "error");
    }
    setCreatingTemplate(false);
  };

  const addPendingEvent = async () => {
    if (!form.employee_id || !form.name) return;

    if (editingExistingShift) {
      const payload = {
        employee_id: form.employee_id, client_id: form.client_id || null, persona_id: form.persona_id || null,
        shift_template_id: form.shift_template_id || null, name: form.name, color: form.color,
        shift_date: editingExistingShift.shift_date || form.shift_date || toLocalDateStr(), 
        start_time: form.start_time, end_time: form.end_time,
        break_minutes: parseInt(form.break_minutes) || 0, priority: form.priority, observations: form.observations
      };
      setSavingShift(true);
      try {
        await api.put(`/scheduling/shifts/${editingExistingShift.id}`, payload);
        addToast("Turno actualizado correctamente", "success");
        setEditingExistingShift(null);
        setFormOpen(false);
        setDetailOpen(false);
        loadCalendar();
        loadSeries();
      } catch(e: any) {
        addToast(e?.response?.data?.detail || "Error al actualizar turno", "error");
      }
      setSavingShift(false);
      return;
    }
    // Date is assigned by drag-and-drop; skip past-date check when no date is set yet
    const emp = employees.find((e) => e.id === form.employee_id);
    const cli = clients.find((c) => c.id === form.client_id);
    const per = personas.find((p) => p.id === form.persona_id);
    const ev: PendingEvent = {
      id: editEvent?.id || uid(), employee_id: form.employee_id, employee_name: emp ? `${emp.first_name} ${emp.last_name}` : "",
      client_id: form.client_id, client_name: cli?.name || "",
      persona_id: form.persona_id, persona_name: per ? `${per.first_name} ${per.last_name}` : "",
      project_id: form.project_id, shift_template_id: form.shift_template_id,
      name: form.name, color: form.color, shift_date: form.shift_date,
      start_time: form.start_time, end_time: form.end_time,
      break_minutes: parseInt(form.break_minutes) || 0,
      priority: form.priority, observations: form.observations,
    };
    const conflicts = findConflictsForEmployee(
      ev.employee_id, ev.shift_date, ev.start_time, ev.end_time,
      existingShifts, pendingEvents, editEvent?.id,
    );
    if (conflicts.length > 0) {
      const msgs = conflicts.map((c) => c.detail).join("; ");
      addToast(`Conflicto detectado — ${msgs}. Corrija antes de continuar.`, "error");
      return;
    }
    if (editEvent) { setPendingEvents((prev) => prev.map((p) => p.id === editEvent.id ? ev : p)); setEditEvent(null); }
    else { setPendingEvents((prev) => [...prev, ev]); }
    setForm({ employee_id: "", client_id: "", persona_id: "", project_id: "", shift_template_id: "", name: "", color: "#3b82f6", shift_date: "", start_time: "08:00", end_time: "17:00", break_minutes: "0", priority: "normal", observations: "", recurrence_type: "none", recurrence_days: "", recurrence_end_date: "", max_occurrences: "" });
    setFormOpen(false);
    setEditingExistingShift(null);
  };

  const removePending = (id: string) => setPendingEvents((prev) => prev.filter((p) => p.id !== id));
  const duplicatePending = (ev: PendingEvent) => {
    const conflicts = findConflictsForEmployee(
      ev.employee_id, ev.shift_date, ev.start_time, ev.end_time,
      existingShifts, pendingEvents,
    );
    if (conflicts.length > 0) {
      const msgs = conflicts.map((c) => c.detail).join("; ");
      addToast(`Conflicto detectado — ${msgs}. No se puede duplicar.`, "error");
      return;
    }
    setPendingEvents((prev) => [...prev, { ...ev, id: uid() }]);
  };
  const editPending = (ev: PendingEvent) => {
    setEditEvent(ev);
    setForm({
      employee_id: ev.employee_id, client_id: ev.client_id, persona_id: ev.persona_id, project_id: ev.project_id,
      shift_template_id: ev.shift_template_id, name: ev.name, color: ev.color, shift_date: ev.shift_date,
      start_time: ev.start_time, end_time: ev.end_time, break_minutes: String(ev.break_minutes),
      priority: ev.priority, observations: ev.observations, recurrence_type: "none", recurrence_days: "", recurrence_end_date: "", max_occurrences: "",
    });
    setFormOpen(true);
  };

  const handleBulkCheck = async () => {
    try {
      const companyId = localStorage.getItem("company_id") || "";
      const events = pendingEvents.map((e) => ({ ...e, break_minutes: e.break_minutes }));
      const res = await api.post("/scheduling/bulk-check", { company_id: companyId, events });
      setConflicts(res.data || []);
      return (res.data || []).length === 0;
    } catch (e: any) { addToast("Error al verificar conflictos: " + (e?.response?.data?.detail || e?.message || "Error desconocido"), "error"); return false; }
  };

  const handleBulkSave = async () => {
    if (pendingEvents.length === 0) return;

    // Clones are events that were dragged to a calendar day (they have shift_date assigned)
    // Originals stay in the left column with no shift_date
    const clonedEvents = pendingEvents.filter((e) => !!e.shift_date);
    const unassigned = pendingEvents.filter((e) => !e.shift_date);

    if (clonedEvents.length === 0) {
      addToast(`Ningún evento tiene fecha asignada. Arrastre los eventos al día correspondiente en el calendario antes de guardar.`, "warning");
      return;
    }
    const unassignedButNotCloned = unassigned.filter((u) => !clonedEvents.some(c => c.original_id === u.id));
    if (unassignedButNotCloned.length > 0) {
      addToast(`${unassignedButNotCloned.length} evento(s) creados aún sin arrastrar al calendario. Se omitirán al guardar.`, "warning");
    }

    const pastEvents = clonedEvents.filter((e) => isDateOrTimePast(e.shift_date, e.start_time).isPast);
    if (pastEvents.length > 0) {
      const firstPast = pastEvents[0];
      const checkMsg = isDateOrTimePast(firstPast.shift_date, firstPast.start_time).message;
      addToast(`Hay ${pastEvents.length} evento(s) en fecha u hora pasada. ${checkMsg}`, "error");
      return;
    }
    const missingEmployee = clonedEvents.filter((e) => !e.employee_id);
    if (missingEmployee.length > 0) {
      addToast(`${missingEmployee.length} evento(s) sin empleado asignado. Edite el evento en el calendario para asignarlo.`, "warning");
      return;
    }
    setSaving(true);
    try {
      const companyId = localStorage.getItem("company_id") || "";
      if (!companyId) {
        addToast("No se encontró la empresa. Inicie sesión nuevamente.", "error");
        setSaving(false);
        return;
      }
      const events = clonedEvents.map((e) => ({
        employee_id: e.employee_id || null, client_id: e.client_id || null, persona_id: e.persona_id || null,
        project_id: e.project_id || null, shift_template_id: e.shift_template_id || null,
        name: e.name || null, color: e.color, shift_date: e.shift_date,
        start_time: e.start_time, end_time: e.end_time,
        break_minutes: e.break_minutes, priority: e.priority, observations: e.observations || null,
      }));
      const savedIds = new Set(clonedEvents.map((e) => e.id));
      const savedOriginalIds = new Set(clonedEvents.map((e) => e.original_id).filter(Boolean));
      const res = await api.post("/scheduling/bulk-save", { company_id: companyId, events });
      if (res.data.success) {
        // Remove clones that were saved AND their originals from the sidebar
        setPendingEvents((prev) => prev.filter((e) => !savedIds.has(e.id) && !savedOriginalIds.has(e.id)));
        setConflicts([]);
        loadCalendar();
        addToast(`${events.length} turno(s) guardado(s) correctamente`, "success");
      } else {
        setConflicts(res.data.conflicts || []);
        if ((res.data.conflicts || []).length > 0) {
          addToast(`${res.data.conflicts.length} conflicto(s) detectado(s)`, "warning");
        }
      }
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || "Error al guardar eventos";
      addToast(msg, "error");
    }
    setSaving(false);
  };

  const handleCreateSeries = async () => {
    if (!seriesForm.name || !seriesForm.employee_id || !seriesForm.start_date) return;
    const checkPast = isDateOrTimePast(seriesForm.start_date, seriesForm.default_start_time);
    if (checkPast.isPast) {
      addToast(checkPast.message, "error");
      return;
    }
    try {
      const companyId = localStorage.getItem("company_id") || "";
      await api.post("/scheduling/series", { company_id: companyId, ...seriesForm,
        max_occurrences: seriesForm.max_occurrences ? parseInt(seriesForm.max_occurrences) : null,
        default_break_minutes: parseInt(seriesForm.default_break_minutes) || 60,
      });
      setSeriesOpen(false);
      setSeriesForm({
        name: "", employee_id: "", client_id: "", persona_id: "", shift_template_id: "",
        recurrence_type: "weekly", recurrence_days: "1,2,3,4,5",
        start_date: "", end_date: "", max_occurrences: "",
        default_start_time: "08:00", default_end_time: "17:00", default_break_minutes: "60",
        default_priority: "normal", default_notes: "", color: "#3b82f6",
      });
      loadSeries();
      addToast("Serie creada correctamente", "success");
    } catch (e: any) { addToast("Error al crear serie: " + (e?.response?.data?.detail || e?.message || "Error desconocido"), "error"); }
  };

  const handleGenerateSeries = async (seriesId: string) => {
    setGenerating(seriesId);
    try {
      const res = await api.post(`/scheduling/series/${seriesId}/generate`);
      if (res.data.success) {
        loadCalendar();
        loadSeries();
        addToast("Serie generada correctamente", "success");
      }
    } catch (e: any) { addToast("Error al generar serie: " + (e?.response?.data?.detail || e?.message || "Error desconocido"), "error"); }
    setGenerating(null);
  };

  const handleCancelShift = async () => {
    if (!selectedEvent?.id) return;
    setCancellingShift(true);
    try {
      await api.put(`/scheduling/shifts/${selectedEvent.id}/cancel`);
      setDetailOpen(false);
      setSelectedEvent(null);
      loadCalendar();
      addToast("Turno cancelado", "success");
    } catch (e: any) { addToast("Error al cancelar turno: " + (e?.response?.data?.detail || e?.message || "Error desconocido"), "error"); }
    setCancellingShift(false);
  };

  const handleDeleteShift = async () => {
    if (!selectedEvent?.id) return;
    setDeletingShift(true);
    try {
      await api.delete(`/scheduling/shifts/${selectedEvent.id}`);
      setDetailOpen(false);
      setSelectedEvent(null);
      addToast("Turno eliminado", "success");
    } catch (e: any) { addToast("Error al eliminar turno: " + (e?.response?.data?.detail || e?.message || "Error desconocido"), "error"); }
    setDeletingShift(false);
  };

  const handleDragStartTemplate = (ev: React.DragEvent, templateId: string) => {
    setDragSource({ type: "template", id: templateId });
    ev.dataTransfer.setData("text/plain", `template:${templateId}`);
    ev.dataTransfer.effectAllowed = "copy";
  };

  const handleDragStartPending = (ev: React.DragEvent, eventId: string) => {
    setDragSource({ type: "pending", id: eventId });
    ev.dataTransfer.setData("text/plain", `pending:${eventId}`);
    ev.dataTransfer.effectAllowed = "copy";
  };

  const handleDropOnDay = (e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    const data = e.dataTransfer.getData("text/plain");
    if (!data) return;
    
    const [type, id] = data.split(":");
    if (type === "template") {
      const t = templates.find((t) => t.id === id);
      if (!t) return;
      
      const checkPast = isDateOrTimePast(dateStr, t.start_time);
      if (checkPast.isPast) {
        addToast(checkPast.message, "error");
        return;
      }

      const newEv: PendingEvent = {
        id: uid(),
        employee_id: "",
        employee_name: "",
        client_id: "",
        persona_id: "",
        persona_name: "",
        client_name: "",
        project_id: "",
        shift_template_id: t.id,
        name: t.name,
        color: t.color,
        shift_date: dateStr,
        start_time: t.start_time,
        end_time: t.end_time,
        break_minutes: 60,
        priority: "normal",
        observations: "",
      };
      setPendingEvents((prev) => {
        // Automatically select if it's the first one, for convenience
        return [...prev, newEv];
      });
    } else if (type === "pending") {
      const original = pendingEvents.find((p) => p.id === id);
      if (!original) return;
      
      // Instead of leaving the original in the sidebar if it had no date, we can just MOVE it if it had no date, or clone if it already had a date (dragging from calendar)
      // Actually, standard behavior: if it's dragged from sidebar (no date), move it to the calendar. If dragged from calendar, move it to new day.
      
      let conflicts = [];
      if (original.employee_id) {
        conflicts = findConflictsForEmployee(
          original.employee_id, dateStr, original.start_time, original.end_time,
          existingShifts, pendingEvents, original.id,
        );
        if (conflicts.length > 0) {
          const msgs = conflicts.map((c) => c.detail).join("; ");
          addToast(`Conflicto detectado — ${msgs}. Corrija antes de continuar.`, "error");
          return;
        }
      }
      
      if (!original.shift_date) {
        // Dragged from sidebar: Clone it so it can be placed multiple times
        const clonedEv: PendingEvent = { ...original, id: uid(), shift_date: dateStr, original_id: original.id };
        setPendingEvents((prev) => [...prev, clonedEv]);
      } else {
        // Dragged from calendar to another day: Move it
        setPendingEvents((prev) => prev.map(p => p.id === id ? { ...p, shift_date: dateStr } : p));
      }
    }
    setDragSource(null);
  };

  const weekDates = useMemo(() => {
    if (view !== "week") return [];
    const d = currentDate;
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) { const dd = new Date(d); dd.setDate(diff + i); dates.push(dd); }
    return dates;
  }, [currentDate, view]);

  const monthDays = useMemo(() => {
    if (view !== "month") return [];
    const d = currentDate;
    const first = new Date(d.getFullYear(), d.getMonth(), 1);
    const startOffset = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;
    const days: { date: Date; inMonth: boolean }[] = [];
    for (let i = 0; i < totalCells; i++) { const dd = new Date(d.getFullYear(), d.getMonth(), 1 - startOffset + i); days.push({ date: dd, inMonth: dd.getMonth() === d.getMonth() }); }
    return days;
  }, [currentDate, view]);

  const hourSlots = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);

  const navigate = (dir: number) => {
    const d = new Date(currentDate);
    if (view === "day") d.setDate(d.getDate() + dir);
    else if (view === "week") d.setDate(d.getDate() + dir * 7);
    else d.setMonth(d.getMonth() + dir);
    setCurrentDate(d);
  };

  const goToday = () => setCurrentDate(new Date());

  const getEventsForDate = (dateStr: string) => existingShifts.filter((e) => e.shift_date === dateStr);

  const pendingForDate = (dateStr: string) => pendingEvents.filter((e) => e.shift_date === dateStr);

  const sourceEvents = useMemo(() => pendingEvents.filter((e) => !e.shift_date), [pendingEvents]);
  const cloneCount = useMemo(() => pendingEvents.filter((e) => e.shift_date).length, [pendingEvents]);

  const summaryStats = useMemo(() => {
    const scheduled = existingShifts.filter((e) => e.status === "scheduled").length;
    const inProgress = existingShifts.filter((e) => e.status === "in_progress").length;
    const completed = existingShifts.filter((e) => e.status === "completed").length;
    const cancelled = existingShifts.filter((e) => e.status === "cancelled").length;
    return { total: existingShifts.length, scheduled, inProgress, completed, cancelled, pending: pendingEvents.length, conflicts: conflicts.length };
  }, [existingShifts, pendingEvents, conflicts]);

  const PendingEventChip = ({ ev, onRemove }: { ev: PendingEvent; onRemove: (id: string) => void }) => (
    <div className="absolute left-0.5 right-0.5 rounded px-1 text-[9px] text-white overflow-hidden border border-dashed border-white/50 z-10 group/chip hover:z-30"
      style={{ backgroundColor: ev.color, opacity: 0.85, top: "2px", minHeight: "20px" }}>
      <p className="font-medium truncate pr-4">{ev.name}</p>
      {!ev.employee_name && <p className="opacity-70 truncate text-[8px]">Sin empleado</p>}
      {ev.employee_name && <p className="opacity-80 truncate text-[8px]">{ev.employee_name}</p>}
      <button onClick={(e) => { e.stopPropagation(); onRemove(ev.id); }}
        className="absolute top-0 right-0 p-0.5 bg-black/30 rounded-bl hover:bg-red-500 opacity-0 group-hover/chip:opacity-100 transition-opacity">
        <X className="h-2.5 w-2.5" />
      </button>
    </div>
  );

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col gap-2 p-2 relative">
      {toasts.length > 0 && (
        <div className="fixed top-4 right-4 z-50 space-y-2">
          {toasts.map((t) => (
            <div key={t.id} className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm text-white animate-in slide-in-from-right ${
              t.type === "error" ? "bg-destructive" : t.type === "warning" ? "bg-amber-500" : "bg-emerald-600"
            }`}>
              {t.type === "error" ? <AlertCircle className="h-4 w-4" /> : t.type === "warning" ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
              {t.message}
            </div>
          ))}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Calendar className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Programación de Turnos</h1>
            <p className="text-xs text-muted-foreground">Planificación horaria, rotaciones y asignación de personal</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setTemplateDialogOpen(true)}><Plus className="mr-1 h-3 w-3" />Crear Plantilla</Button>
          <Button variant="outline" size="sm" onClick={() => {
            setEditEvent(null);
            setEditingExistingShift(null);
            setForm({ employee_id: "", client_id: "", persona_id: "", project_id: "", shift_template_id: "", name: "", color: "#3b82f6", shift_date: "", start_time: "08:00", end_time: "17:00", break_minutes: "0", priority: "normal", observations: "", recurrence_type: "none", recurrence_days: "", recurrence_end_date: "", max_occurrences: "" });
            setFormOpen(true);
          }}><Plus className="mr-1 h-3 w-3" />Crear Evento</Button>
          {pendingEvents.length > 0 && (
            <>
              {pendingEvents.filter((e) => !e.employee_id && !!e.shift_date).length > 0 && (
                <span className="text-xs text-amber-600 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {pendingEvents.filter((e) => !e.employee_id && !!e.shift_date).length} sin empleado
                </span>
              )}
              <Button size="sm" onClick={handleBulkSave} disabled={saving}>
                {saving ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Save className="mr-1 h-3 w-3" />}
                Guardar ({pendingEvents.filter((e) => !!e.shift_date).length})
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col xl:flex-row gap-2 min-h-0 overflow-y-auto xl:overflow-hidden">
        {/* LEFT SIDEBAR: Source Events */}
        <div className="w-full xl:w-72 flex-shrink-0 flex flex-col gap-2 min-h-[300px] xl:min-h-0">
          <Card className="flex-1 flex flex-col min-h-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between">
                Eventos
                <div className="flex items-center gap-1">
                  <Badge variant="secondary">{sourceEvents.length}</Badge>
                  {cloneCount > 0 && <Badge variant="outline" className="text-[10px]">+{cloneCount} días</Badge>}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-2 space-y-1">
              {sourceEvents.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Cree eventos y arrastrelos al calendario. Puede arrastrar el mismo evento a varios días.</p>
              ) : (
                sourceEvents.map((ev) => (
                  <div key={ev.id} draggable onDragStart={(e) => handleDragStartPending(e, ev.id)}
                    className="p-2 rounded border cursor-grab active:cursor-grabbing hover:shadow-sm transition-shadow text-xs"
                    style={{ borderLeftColor: ev.color, borderLeftWidth: 3 }}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{ev.name}</p>
                        {ev.employee_name ? (
                          <p className="text-muted-foreground truncate">{ev.employee_name}</p>
                        ) : (
                          <p className="text-amber-600 truncate text-[10px]">Sin empleado asignado</p>
                        )}
                        {ev.client_name && <p className="text-muted-foreground truncate">{ev.client_name}</p>}
                        <p className="text-muted-foreground">{ev.shift_date} {ev.start_time}-{ev.end_time}</p>
                      </div>
                      <div className="flex gap-0.5 ml-1">
                        <button onClick={() => editPending(ev)} className="p-0.5 hover:bg-muted rounded"><GripVertical className="h-3 w-3" /></button>
                        <button onClick={() => duplicatePending(ev)} className="p-0.5 hover:bg-muted rounded"><Copy className="h-3 w-3" /></button>
                        <button onClick={() => removePending(ev.id)} className="p-0.5 hover:bg-muted rounded"><X className="h-3 w-3 text-destructive" /></button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
          {conflicts.length > 0 && (
            <Card className="border-destructive">
              <CardHeader className="pb-1"><CardTitle className="text-sm text-destructive flex items-center gap-1"><AlertTriangle className="h-4 w-4" />Conflictos</CardTitle></CardHeader>
              <CardContent className="p-2 space-y-1">
                {conflicts.map((c, i) => (
                  <div key={i} className="text-xs p-2 rounded bg-destructive/10 text-destructive">{c.message}</div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* MAIN: Calendar */}
        <div className="flex-1 flex-shrink-0 flex flex-col min-h-[600px] xl:min-h-0 min-w-0">
          {/* Calendar Controls */}
          <div className="flex items-center justify-between mb-2 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="outline" size="sm" onClick={goToday}>Hoy</Button>
              <Button variant="ghost" size="sm" onClick={() => navigate(1)}><ChevronRight className="h-4 w-4" /></Button>
              <span className="text-sm font-medium ml-2">
                {view === "day" && currentDate.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                {view === "week" && `${weekDates[0]?.toLocaleDateString("es-CO", { day: "numeric", month: "short" })} - ${weekDates[6]?.toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" })}`}
                {view === "month" && `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`}
                {view === "agenda" && `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`}
              </span>
            </div>
            <div className="flex gap-1">
              {(["day", "week", "month", "agenda"] as ViewMode[]).map((v) => (
                <Button key={v} variant={view === v ? "default" : "ghost"} size="sm" onClick={() => setView(v)} className="text-xs">
                  {v === "day" ? "Día" : v === "week" ? "Semana" : v === "month" ? "Mes" : "Agenda"}
                </Button>
              ))}
            </div>
          </div>

          <Card className="flex-1 min-h-0 overflow-hidden">
            <CardContent className="p-0 h-full overflow-auto">
              {/* DAY VIEW */}
              {view === "day" && (
                <div className="h-full">
                  {hourSlots.map((hour) => {
                    const dateStr = toLocalDateStr(currentDate);
                    const timeStr = `${String(hour).padStart(2, "0")}:00`;
                    const dayEvents = getEventsForDate(dateStr).filter((e) => { const h = parseInt(e.start_time.split(":")[0]); return h === hour; });
                    const dayPend = pendingForDate(dateStr).filter((e) => { const h = parseInt(e.start_time.split(":")[0]); return h === hour; });
                    return (
                      <div key={hour} className="flex border-b min-h-[48px]"
                        onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDropOnDay(e, dateStr)}>
                        <div className="w-14 text-xs text-muted-foreground text-right pr-2 pt-1 flex-shrink-0">{timeStr}</div>
                        <div className="flex-1 relative p-0.5">
                          {dayEvents.map((ev) => (
                            <div key={ev.id} onClick={() => { setSelectedEvent(ev); setDetailOpen(true); }}
                              className="absolute left-0 right-0 rounded px-1.5 py-0.5 text-[10px] text-white cursor-pointer overflow-hidden"
                              style={{ backgroundColor: ev.color, top: "2px", minHeight: "24px" }}>
                              <span className="font-medium">{ev.start_time}-{ev.end_time}</span> {ev.title}
                              {ev.employee_name && <span className="ml-1 opacity-80">· {ev.employee_name}</span>}
                            </div>
                          ))}
                          {dayPend.map((ev) => (
                            <PendingEventChip key={ev.id} ev={ev} onRemove={removePending} />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* WEEK VIEW */}
              {view === "week" && (
                <div className="h-full flex">
                  <div className="w-12 flex-shrink-0 border-r">
                    {hourSlots.map((h) => <div key={h} className="h-12 text-[10px] text-muted-foreground text-right pr-1 pt-0.5">{String(h).padStart(2, "0")}:00</div>)}
                  </div>
                  {weekDates.map((d) => {
                    const dateStr = toLocalDateStr(d);
                    const isToday = dateStr === toLocalDateStr();
                    const isPast = isDatePast(dateStr);
                    const dayEvents = getEventsForDate(dateStr);
                    const dayPend = pendingForDate(dateStr);
                    return (
                      <div key={dateStr} className={`flex-1 border-r ${isToday ? "bg-primary/5" : ""} ${isPast ? "bg-muted/30" : ""}`}
                        onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDropOnDay(e, dateStr)}>
                        <div className={`text-center py-1 text-xs font-medium border-b ${isToday ? "text-primary" : ""} ${isPast ? "text-muted-foreground/50" : ""}`}>
                          {daysOfWeek[(d.getDay() + 6) % 7]} {d.getDate()}
                          {isPast && <span className="text-[8px] block text-muted-foreground/40">pasado</span>}
                        </div>
                        <div className="relative">
                          {hourSlots.map((h) => <div key={h} className="h-12 border-b border-muted/50" />)}
                          {dayEvents.map((ev) => {
                            const [sh, sm] = ev.start_time.split(":").map(Number);
                            const [eh, em] = ev.end_time.split(":").map(Number);
                            const top = sh * 48 + (sm / 60) * 48;
                            const height = Math.max(((eh - sh) * 60 + (em - sm)) / 60 * 48, 20);
                            return (
                              <div key={ev.id} onClick={() => { setSelectedEvent(ev); setDetailOpen(true); }}
                                className="absolute left-0.5 right-0.5 rounded px-1 text-[10px] text-white cursor-pointer overflow-hidden z-10 hover:z-20 hover:shadow-md"
                                style={{ backgroundColor: ev.color, top: `${top}px`, height: `${height}px` }}>
                                <p className="font-medium truncate">{ev.title}</p>
                                {height >= 32 && <p className="opacity-80 truncate text-[9px]">{ev.employee_name}</p>}
                                {height >= 48 && ev.client_name && <p className="opacity-70 truncate text-[8px]">{ev.client_name}</p>}
                              </div>
                            );
                          })}
                          {dayPend.map((ev) => {
                            const [sh, sm] = ev.start_time.split(":").map(Number);
                            const [eh, em] = ev.end_time.split(":").map(Number);
                            const top = sh * 48 + (sm / 60) * 48;
                            const height = Math.max(((eh - sh) * 60 + (em - sm)) / 60 * 48, 20);
                            return (
                              <div key={ev.id} draggable onDragStart={(e) => handleDragStartPending(e, ev.id)}
                                className="absolute left-0.5 right-0.5 rounded px-1 text-[9px] text-white overflow-hidden border border-dashed border-white/50 z-10 group/chip hover:z-30 cursor-grab"
                                style={{ backgroundColor: ev.color, opacity: 0.85, top: `${top}px`, height: `${height}px` }}>
                                <p className="font-medium truncate pr-4">{ev.name}</p>
                                {!ev.employee_name && <p className="opacity-70 truncate text-[8px]">Sin empleado</p>}
                                {ev.employee_name && <p className="opacity-80 truncate text-[8px]">{ev.employee_name}</p>}
                                <button onClick={(e) => { e.stopPropagation(); removePending(ev.id); }}
                                  className="absolute top-0 right-0 p-0.5 bg-black/30 rounded-bl hover:bg-red-500 opacity-0 group-hover/chip:opacity-100 transition-opacity">
                                  <X className="h-2.5 w-2.5" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* MONTH VIEW */}
              {view === "month" && (
                <div className="h-full grid grid-cols-7 gap-px bg-border">
                  {daysOfWeek.map((d) => <div key={d} className="bg-muted p-1.5 text-center text-[10px] font-medium text-muted-foreground">{d}</div>)}
                  {monthDays.map(({ date: d, inMonth }, i) => {
                    const dateStr = toLocalDateStr(d);
                    const isToday = dateStr === toLocalDateStr();
                    const isPast = isDatePast(dateStr);
                    const dayEvents = getEventsForDate(dateStr);
                    const dayPend = pendingForDate(dateStr);
                    return (
                      <div key={i}
                        className={`bg-card p-1 min-h-[80px] ${isToday ? "ring-1 ring-primary" : ""} ${!inMonth ? "opacity-30" : ""} ${isPast ? "bg-muted/20" : ""}`}
                        onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDropOnDay(e, dateStr)}>
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] ${isToday ? "font-bold text-primary" : isPast ? "text-muted-foreground/40" : "text-muted-foreground"}`}>{d.getDate()}</span>
                          {isPast && <span className="text-[7px] text-muted-foreground/30">X</span>}
                        </div>
                        {dayEvents.slice(0, 3).map((ev) => (
                          <div key={ev.id} onClick={() => { setSelectedEvent(ev); setDetailOpen(true); }}
                            className="text-[8px] rounded px-0.5 py-0.5 text-white truncate cursor-pointer"
                            style={{ backgroundColor: ev.color }}>
                            {ev.start_time} {ev.title}
                          </div>
                        ))}
                        {dayPend.slice(0, 2).map((ev) => (
                          <div key={ev.id} className="text-[8px] rounded px-0.5 py-0.5 text-white truncate opacity-80 border border-dashed relative group/chip"
                            style={{ backgroundColor: ev.color }}>
                            {ev.start_time} {ev.name}
                            <button onClick={(e) => { e.stopPropagation(); removePending(ev.id); }}
                              className="absolute -top-1 -right-1 bg-black/40 rounded-full p-0 hover:bg-red-500 opacity-0 group-hover/chip:opacity-100 transition-opacity">
                              <X className="h-2 w-2" />
                            </button>
                          </div>
                        ))}
                        {(dayEvents.length + dayPend.length) > 5 && <p className="text-[8px] text-muted-foreground">+{(dayEvents.length + dayPend.length) - 5} más</p>}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* AGENDA VIEW */}
              {view === "agenda" && (
                <div className="p-4 space-y-3">
                  {(() => {
                    const allEvents = [...existingShifts, ...pendingEvents.map((e) => ({
                      id: e.id, title: e.name, start: `${e.shift_date}T${e.start_time}:00`,
                      end: `${e.shift_date}T${e.end_time}:00`, employee_id: e.employee_id,
                      employee_name: e.employee_name, client_name: e.client_name, persona_name: e.persona_name,
                      status: "pending", color: e.color, start_time: e.start_time, end_time: e.end_time, shift_date: e.shift_date,
                      _isPending: true,
                    }))];
                    allEvents.sort((a, b) => a.start.localeCompare(b.start));
                    if (allEvents.length === 0) return <p className="text-sm text-muted-foreground text-center py-8">Sin eventos</p>;
                    const grouped: Record<string, any[]> = {};
                    allEvents.forEach((e) => { const d = e.shift_date || e.start.split("T")[0]; if (!grouped[d]) grouped[d] = []; grouped[d].push(e); });
                    return Object.entries(grouped).map(([date, evts]) => {
                      const isPast = isDatePast(date);
                      return (
                        <div key={date} className={isPast ? "opacity-40" : ""}>
                          <h3 className="text-xs font-semibold text-muted-foreground mb-1">
                            {new Date(date + "T12:00:00").toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" })}
                            {isPast && <span className="text-[9px] ml-2 text-muted-foreground/50">(pasado)</span>}
                          </h3>
                          {evts.map((ev) => (
                            <div key={ev.id}
                              className={`flex items-center gap-2 p-2 rounded hover:bg-muted/50 cursor-pointer text-sm ${ev._isPending ? "border border-dashed" : ""}`}
                              style={{ borderLeft: `3px solid ${ev.color}` }}>
                              <span className="font-mono text-xs text-muted-foreground w-24">{ev.start_time} - {ev.end_time}</span>
                              <span className="font-medium flex-1">{ev.title}</span>
                              <span className="text-xs text-muted-foreground">{ev.employee_name}</span>
                              {ev._isPending && <Badge variant="secondary" className="text-[9px]">Pendiente</Badge>}
                              {ev._isPending && (
                                <button onClick={(e) => { e.stopPropagation(); removePending(ev.id); }}
                                  className="p-0.5 hover:bg-destructive/10 rounded">
                                  <X className="h-3 w-3 text-destructive" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT SIDEBAR: Summary + Templates */}
        <div className="w-full xl:w-56 flex-shrink-0 flex flex-col gap-2 min-h-[300px] xl:min-h-0">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Resumen</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span className="font-bold">{summaryStats.total}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Programados</span><Badge variant="default">{summaryStats.scheduled}</Badge></div>
              <div className="flex justify-between"><span className="text-muted-foreground">En progreso</span><Badge variant="success">{summaryStats.inProgress}</Badge></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Completados</span><Badge variant="secondary">{summaryStats.completed}</Badge></div>
              {summaryStats.cancelled > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Cancelados</span><Badge variant="destructive">{summaryStats.cancelled}</Badge></div>}
              <hr />
              <div className="flex justify-between"><span className="text-muted-foreground">Pendientes</span><Badge variant="outline">{summaryStats.pending}</Badge></div>
              {summaryStats.conflicts > 0 && <div className="flex justify-between"><span className="text-destructive">Conflictos</span><Badge variant="destructive">{summaryStats.conflicts}</Badge></div>}
            </CardContent>
          </Card>
          <Card className="flex-1 flex flex-col min-h-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between">
                <span>Plantillas</span>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" className="h-6 px-1 text-[10px] text-blue-600 hover:text-blue-700 font-semibold" onClick={() => router.push("/scheduling/templates")} title="Gestionar Catálogo Completo">
                    Catálogo
                  </Button>
                  <Button variant="ghost" size="sm" className="h-6 px-1.5" onClick={() => { setEditingTemplate(null); setTemplateForm({ name: "", color: "#3b82f6", start_time: "08:00", end_time: "17:00", shift_type: "regular", observations: "" }); setTemplateDialogOpen(true); }} title="Nueva Plantilla">
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </CardTitle>
              <p className="text-[10px] text-muted-foreground">Arrastre al calendario o gestione</p>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-2 space-y-1">
              {templates.length === 0 ? (
                <p className="text-[10px] text-muted-foreground text-center py-2">Sin plantillas</p>
              ) : (
                templates.map((t) => (
                  <div key={t.id} draggable onDragStart={(e) => handleDragStartTemplate(e, t.id)}
                    className="flex items-center gap-1.5 text-xs p-1.5 rounded hover:bg-muted/50 cursor-grab active:cursor-grabbing border border-transparent hover:border-primary/30 transition-colors group/tmpl"
                    title={`Arrastrar "${t.name}" al calendario`}>
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: t.color }} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate text-[11px]">{t.name}</p>
                      <p className="text-[10px] text-muted-foreground">{t.start_time}-{t.end_time}</p>
                    </div>
                    <div className="flex items-center gap-0.5 transition-opacity">
                      <button onClick={(e) => openEditTemplate(t, e)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-blue-600" title="Editar plantilla">
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button onClick={(e) => handleDeleteTemplate(t, e)} className="p-1 hover:bg-rose-100 dark:hover:bg-rose-950 rounded text-rose-600" title="Eliminar plantilla">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                    <GripVertical className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                  </div>
                ))
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Series Recurrentes</CardTitle>
              <Button variant="ghost" size="sm" className="h-6 px-1.5" onClick={() => setSeriesOpen(true)}><Plus className="h-3 w-3" /></Button>
            </CardHeader>
            <CardContent className="space-y-1">
              {series.length === 0 ? (
                <p className="text-[10px] text-muted-foreground text-center py-2">Sin series</p>
              ) : series.slice(0, 4).map((s) => (
                <div key={s.id} className="text-xs p-1.5 rounded border space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                      <span className="font-medium truncate">{s.name}</span>
                    </div>
                    <Button variant="ghost" size="sm" className="h-5 px-1" onClick={() => handleGenerateSeries(s.id)} disabled={generating === s.id}>
                      {generating === s.id ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : "Gen"}
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground">{s.recurrence_type} · {s.total_generated} generados</p>
                </div>
              ))}
              {series.length > 4 && <p className="text-[10px] text-muted-foreground text-center">+{series.length - 4} más</p>}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Event Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle style={{ color: selectedEvent?.color }}>{selectedEvent?.title}</DialogTitle>
            <DialogDescription>{selectedEvent?.employee_name}</DialogDescription>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Fecha</span><span>{selectedEvent.shift_date}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Horario</span><span>{selectedEvent.start_time} - {selectedEvent.end_time}</span></div>
              {selectedEvent.client_name && <div className="flex justify-between"><span className="text-muted-foreground">Cliente</span><span>{selectedEvent.client_name}</span></div>}
              {selectedEvent.persona_name && <div className="flex justify-between"><span className="text-muted-foreground">Persona</span><span>{selectedEvent.persona_name}</span></div>}
              <div className="flex justify-between"><span className="text-muted-foreground">Estado</span><Badge variant={selectedEvent.status === "cancelled" ? "destructive" : "default"}>{selectedEvent.status}</Badge></div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            {selectedEvent && (
              <>
                <Button variant="outline" size="sm" onClick={() => {
                  setEditingExistingShift(selectedEvent);
                  setForm({
                    employee_id: selectedEvent.employee_id || "", client_id: selectedEvent.client_id || "", persona_id: selectedEvent.persona_id || "", project_id: "",
                    shift_template_id: selectedEvent.shift_template_id || "", name: selectedEvent.title, color: selectedEvent.color || "#3b82f6", shift_date: selectedEvent.shift_date || "",
                    start_time: selectedEvent.start_time, end_time: selectedEvent.end_time, break_minutes: String(selectedEvent.break_minutes || 0), priority: selectedEvent.priority || "normal", observations: selectedEvent.observations || "",
                    recurrence_type: "none", recurrence_days: "", recurrence_end_date: "", max_occurrences: ""
                  });
                  setFormOpen(true);
                }}>
                  <Pencil className="mr-1 h-3 w-3" /> Editar
                </Button>
                {selectedEvent.status !== "cancelled" && (
                  <Button variant="outline" size="sm" onClick={handleCancelShift} disabled={cancellingShift}>
                    {cancellingShift ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <X className="mr-1 h-3 w-3" />}
                    Cancelar Turno
                  </Button>
                )}
                <Button variant="destructive" size="sm" onClick={handleDeleteShift} disabled={deletingShift}>
                  {deletingShift ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Trash2 className="mr-1 h-3 w-3" />}
                  Eliminar
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Event Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingExistingShift ? "Editar Turno Creado" : editEvent ? "Editar Evento Pendiente" : "Crear Evento de Programación"}</DialogTitle>
            <DialogDescription>Seleccione empleado, cliente/sede y horario. El evento quedará listo en la columna de Pendientes para arrastrarlo a los días correspondientes en el calendario.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Plantilla de Turno</label>
                <select className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm" value={form.shift_template_id} onChange={(e) => {
                  const tid = e.target.value;
                  const t = templates.find((t) => t.id === tid);
                  setForm((prev) => ({
                    ...prev,
                    shift_template_id: tid,
                    name: t ? t.name : prev.name,
                    start_time: t ? t.start_time : prev.start_time,
                    end_time: t ? t.end_time : prev.end_time,
                    color: t && t.color ? t.color : prev.color,
                  }));
                }}>
                  <option value="">Sin plantilla</option>
                  {templates.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.start_time}-{t.end_time})</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Nombre del Evento *</label>
                <Input placeholder="Visita domiciliaria" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Empleado *</label>
                <select className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm" value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })}>
                  <option value="">Seleccionar</option>
                  {employees.map((e) => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Cliente / Sede *</label>
                  {clients.length > 0 && (
                    <span className="text-[10px] text-muted-foreground font-semibold">{filteredClients.length} / {clients.length} sedes</span>
                  )}
                </div>
                <div className="space-y-1">
                  <Input
                    placeholder="🔍 Buscar cliente o sede por nombre..."
                    value={clientSearchQuery}
                    onChange={(e) => setClientSearchQuery(e.target.value)}
                    className="h-8 text-xs bg-slate-50 dark:bg-slate-900 border-blue-200"
                  />
                  <select className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm font-semibold" value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })}>
                    <option value="">-- Sin cliente especifico (Sede general) --</option>
                    {filteredClients.map((c) => (
                      <option key={c.id} value={c.id}>
                        🏢 {c.name} {c.city ? `(${c.city})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Persona / Paciente</label>
                <select className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm" value={form.persona_id} onChange={(e) => setForm({ ...form, persona_id: e.target.value })} disabled={!form.client_id}>
                  <option value="">{form.client_id ? "Sin persona" : "Seleccione cliente primero"}</option>
                  {personas.map((p) => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Color del Evento</label>
                <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="w-full h-10 rounded border cursor-pointer" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Hora Inicio *</label>
                <Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Hora Fin *</label>
                <Input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Observaciones</label>
              <textarea className="flex min-h-[60px] w-full rounded-md border bg-background px-3 py-2 text-sm" value={form.observations} onChange={(e) => setForm({ ...form, observations: e.target.value })} placeholder="Instrucciones o detalles de la atención..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setFormOpen(false); setEditEvent(null); }}>Cancelar</Button>
            <Button onClick={addPendingEvent} disabled={!form.employee_id || !form.name}>
              {savingShift ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {editingExistingShift ? "Guardar Cambios" : editEvent ? "Actualizar Evento" : "Agregar a Pendientes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Series Dialog */}
      <Dialog open={seriesOpen} onOpenChange={setSeriesOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Crear Serie Recurrente</DialogTitle>
            <DialogDescription>Defina las reglas de recurrencia para generar turnos automáticamente.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nombre *</label>
                <Input placeholder="Turno nocturno fijo" value={seriesForm.name} onChange={(e) => setSeriesForm({ ...seriesForm, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Empleado *</label>
                <select className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm" value={seriesForm.employee_id} onChange={(e) => setSeriesForm({ ...seriesForm, employee_id: e.target.value })}>
                  <option value="">Seleccionar</option>
                  {employees.map((e) => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Plantilla de Turno</label>
                <select className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm" value={seriesForm.shift_template_id} onChange={(e) => setSeriesForm({ ...seriesForm, shift_template_id: e.target.value })}>
                  <option value="">Sin plantilla</option>
                  {templates.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.start_time}-{t.end_time})</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Color</label>
                <input type="color" value={seriesForm.color} onChange={(e) => setSeriesForm({ ...seriesForm, color: e.target.value })} className="w-full h-10 rounded border cursor-pointer" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Cliente</label>
                <select className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm" value={seriesForm.client_id} onChange={(e) => setSeriesForm({ ...seriesForm, client_id: e.target.value })}>
                  <option value="">Sin cliente</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Persona</label>
                <select className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm" value={seriesForm.persona_id} onChange={(e) => setSeriesForm({ ...seriesForm, persona_id: e.target.value })} disabled={!seriesForm.client_id}>
                  <option value="">{seriesForm.client_id ? "Sin persona" : "Seleccione cliente"}</option>
                  {personas.map((p) => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
                </select>
              </div>
            </div>
            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-3">Recurrencia</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Tipo</label>
                  <select className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm" value={seriesForm.recurrence_type} onChange={(e) => setSeriesForm({ ...seriesForm, recurrence_type: e.target.value })}>
                    <option value="daily">Diario</option>
                    <option value="weekly">Semanal</option>
                    <option value="biweekly">Quincenal</option>
                    <option value="monthly">Mensual</option>
                    <option value="custom">Personalizado</option>
                  </select>
                </div>
                {seriesForm.recurrence_type === "custom" && (
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">Días (1=Lun..7=Dom)</label>
                    <Input placeholder="1,2,3,4,5" value={seriesForm.recurrence_days} onChange={(e) => setSeriesForm({ ...seriesForm, recurrence_days: e.target.value })} />
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Fecha inicio *</label>
                  <Input type="date" value={seriesForm.start_date} onChange={(e) => setSeriesForm({ ...seriesForm, start_date: e.target.value })} min={todayStr} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Fecha fin</label>
                  <Input type="date" value={seriesForm.end_date} onChange={(e) => setSeriesForm({ ...seriesForm, end_date: e.target.value })} min={todayStr} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Máx. ocurrencias</label>
                  <Input type="number" placeholder="Ej: 52" value={seriesForm.max_occurrences} onChange={(e) => setSeriesForm({ ...seriesForm, max_occurrences: e.target.value })} />
                </div>
              </div>
            </div>
            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-3">Horario por Defecto</p>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Hora Inicio *</label>
                  <Input type="time" value={seriesForm.default_start_time} onChange={(e) => setSeriesForm({ ...seriesForm, default_start_time: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Hora Fin *</label>
                  <Input type="time" value={seriesForm.default_end_time} onChange={(e) => setSeriesForm({ ...seriesForm, default_end_time: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Descanso (min)</label>
                  <Input type="number" value={seriesForm.default_break_minutes} onChange={(e) => setSeriesForm({ ...seriesForm, default_break_minutes: e.target.value })} />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Notas</label>
              <textarea className="flex min-h-[60px] w-full rounded-md border bg-background px-3 py-2 text-sm" value={seriesForm.default_notes} onChange={(e) => setSeriesForm({ ...seriesForm, default_notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSeriesOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateSeries} disabled={!seriesForm.name || !seriesForm.employee_id || !seriesForm.start_date}>Crear Serie</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create / Edit Template Dialog */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? `Editar Plantilla de Turno (${editingTemplate.name})` : "Crear Plantilla de Turno"}</DialogTitle>
            <DialogDescription>Defina un modelo reutilizable de horario para asignar a empleados.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nombre *</label>
              <Input placeholder="Ej: Turno Diurno, Turno Nocturno" value={templateForm.name} onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Hora Inicio *</label>
                <Input type="time" value={templateForm.start_time} onChange={(e) => setTemplateForm({ ...templateForm, start_time: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Hora Fin *</label>
                <Input type="time" value={templateForm.end_time} onChange={(e) => setTemplateForm({ ...templateForm, end_time: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo de Turno</label>
                <select className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm" value={templateForm.shift_type} onChange={(e) => setTemplateForm({ ...templateForm, shift_type: e.target.value })}>
                  <option value="regular">Regular</option>
                  <option value="night">Nocturno</option>
                  <option value="split">Dividido</option>
                  <option value="flexible">Flexible</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Color</label>
                <input type="color" value={templateForm.color} onChange={(e) => setTemplateForm({ ...templateForm, color: e.target.value })} className="w-full h-10 rounded border cursor-pointer" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Observaciones</label>
              <textarea className="flex min-h-[60px] w-full rounded-md border bg-background px-3 py-2 text-sm" value={templateForm.observations} onChange={(e) => setTemplateForm({ ...templateForm, observations: e.target.value })} placeholder="Notas opcionales sobre este tipo de turno" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setTemplateDialogOpen(false); setEditingTemplate(null); }}>Cancelar</Button>
            <Button onClick={handleSaveTemplate} disabled={creatingTemplate || !templateForm.name}>
              {creatingTemplate ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : editingTemplate ? <Pencil className="mr-1 h-3 w-3" /> : <Plus className="mr-1 h-3 w-3" />}
              {editingTemplate ? "Guardar Cambios" : "Crear Plantilla"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
