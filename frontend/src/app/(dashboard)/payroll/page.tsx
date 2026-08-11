"use client";
import React, { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Plus, DollarSign, Calculator, FileText, CheckCircle2, AlertCircle, Eye, Play, Search, Calendar, History, TrendingUp, Printer } from "lucide-react";
import { CuentaDeCobroTemplate } from "@/components/payroll/CuentaDeCobroTemplate";
import { useSystemConfig } from "@/lib/useSystemConfig";

export default function PayrollPage() {
  const { configs } = useSystemConfig();
  const minimumWage = Number(configs.find(c => c.key === "MINIMUM_WAGE")?.value || 1300000);
  const transportAllowance = Number(configs.find(c => c.key === "TRANSPORT_ALLOWANCE")?.value || 162000);
  const [periods, setPeriods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newPeriod, setNewPeriod] = useState({
    name: `Nómina ${new Date().toLocaleString("es-CO", { month: "long" }).toUpperCase()} ${new Date().getFullYear()}`,
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    start_date: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-01`,
    end_date: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-30`,
    payment_date: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-30`,
  });
  const [calcOpen, setCalcOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<any>(null);
  const [contracts, setContracts] = useState<any[]>([]);
  const [calcResults, setCalcResults] = useState<any[]>([]);
  const [calculating, setCalculating] = useState(false);

  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const companyId = typeof window !== "undefined" ? localStorage.getItem("company_id") || "dla-company-main" : "dla-company-main";

  const [activeTab, setActiveTab] = useState<"history" | "pending">("history");
  const [pendingReport, setPendingReport] = useState<any[]>([]);
  const [loadingReport, setLoadingReport] = useState(false);
  
  const [printData, setPrintData] = useState<any>(null);
  const printRef = React.useRef<HTMLDivElement>(null);

  const handlePrint = async (record: any, period: any) => {
    setPrintData({ 
      employee: record.contract.employee, 
      company: { name: "DLA Redes y Seguridad", tax_id: "900123456-1", address: "Bogotá", city: "Bogotá" }, 
      period, 
      amount: record.result.net_pay 
    });
    
    // Wait for state to update and render
    setTimeout(() => {
      window.print();
    }, 500);
  };
  const [reportDates, setReportDates] = useState({
    start: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-01`,
    end: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-30`,
  });

  const loadPendingReport = useCallback(async () => {
    setLoadingReport(true);
    try {
      const res = await api.get(`/payroll/pending-report`, {
        params: {
          company_id: companyId,
          start_date: reportDates.start,
          end_date: reportDates.end
        }
      });
      setPendingReport(res.data.report || []);
    } catch {
      setPendingReport([]);
    }
    setLoadingReport(false);
  }, [companyId, reportDates]);

  useEffect(() => {
    if (activeTab === "pending") {
      loadPendingReport();
    }
  }, [activeTab, loadPendingReport]);


  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const loadPeriods = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/payroll/periods`, { params: { company_id: companyId } });
      setPeriods(res.data.items || []);
    } catch {
      setPeriods([]);
    }
    setLoading(false);
  }, [companyId]);

  const loadContracts = useCallback(async () => {
    try {
      const res = await api.get(`/contracts`, { params: { company_id: companyId, status: "active", page_size: 100 } });
      setContracts(res.data.items || []);
    } catch {}
  }, [companyId]);

  useEffect(() => {
    loadPeriods();
    loadContracts();
  }, [loadPeriods, loadContracts]);

  const handleCreatePeriod = async () => {
    try {
      await api.post("/payroll/periods", {
        company_id: companyId,
        ...newPeriod,
      });
      showToast("success", "Período de nómina creado correctamente");
      setDialogOpen(false);
      loadPeriods();
    } catch (e: any) {
      showToast("error", e?.response?.data?.detail || "Error al crear período de nómina");
    }
  };

  const openCalculateModal = async (period: any) => {
    setSelectedPeriod(period);
    setCalcOpen(true);
    setCalculating(true);
    try {
      // Calculate payroll records for all active contracts according to Colombian Labor Law
      const results = [];
      for (const contract of contracts) {
        try {
          const res = await api.post(`/payroll/periods/${period.id}/calculate`, {
            period_id: period.id,
            employee_id: contract.employee_id,
            contract: contract,
            worked_days: 30,
          });
          results.push({
            contract,
            result: res.data,
          });
        } catch {
          // Fallback calculation in client according to CST
          const salary = Number(contract.salary || minimumWage);
          const isTrans = contract.transportation_assistance ?? true;
          const transVal = (salary <= (minimumWage * 2) && isTrans) ? transportAllowance : 0;
          const healthDed = salary * 0.04;
          const pensionDed = salary * 0.04;
          const netPay = (salary + transVal) - (healthDed + pensionDed);

          results.push({
            contract,
            result: {
              net_pay: netPay,
              total_earnings: salary + transVal,
              total_deductions: healthDed + pensionDed,
              social_benefits: {
                cesantias: (salary + transVal) * 0.0833,
                int_cesantias: (salary + transVal) * 0.0833 * 0.12,
                prima: (salary + transVal) * 0.0833,
                vacaciones: salary * 0.0417,
                total_benefits: (salary + transVal) * 0.0833 + (salary + transVal) * 0.0833 * 0.12 + (salary + transVal) * 0.0833 + salary * 0.0417,
              },
            },
          });
        }
      }
      setCalcResults(results);
    } catch {}
    setCalculating(false);
  };

  const handleClosePeriod = async (periodId: string) => {
    try {
      await api.post(`/payroll/periods/${periodId}/close`);
      showToast("success", "Período de nómina cerrado correctamente");
      loadPeriods();
    } catch (e: any) {
      showToast("error", e?.response?.data?.detail || "Error al cerrar período");
    }
  };

  return (
    <div className="w-full relative">
      <div className="space-y-6 print:hidden">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-white text-sm max-w-md ${toast.type === "success" ? "bg-green-600" : "bg-red-600"}`}>
          {toast.type === "success" ? <CheckCircle2 className="h-4 w-4 flex-shrink-0" /> : <AlertCircle className="h-4 w-4 flex-shrink-0" />}
          {toast.message}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Liquidación de Nómina Colombiana (CST)</h1>
          <p className="text-muted-foreground">Cálculo conforme a la legislación laboral de Colombia según el Tipo de Contrato y Esquema</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}><Plus className="mr-2 h-4 w-4" />Nuevo Período de Nómina</Button>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="p-6 flex items-center gap-4">
          <div className="rounded-xl bg-green-50 text-green-600 p-3"><DollarSign className="h-5 w-5" /></div>
          <div><p className="text-xs text-muted-foreground">Salario Mínimo (SMLV)</p><p className="text-xl font-bold">${minimumWage.toLocaleString("es-CO")} COP</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-6 flex items-center gap-4">
          <div className="rounded-xl bg-blue-50 text-blue-600 p-3"><DollarSign className="h-5 w-5" /></div>
          <div><p className="text-xs text-muted-foreground">Auxilio de Transporte</p><p className="text-xl font-bold">${transportAllowance.toLocaleString("es-CO")} COP</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-6 flex items-center gap-4">
          <div className="rounded-xl bg-purple-50 text-purple-600 p-3"><Calculator className="h-5 w-5" /></div>
          <div><p className="text-xs text-muted-foreground">Cesantías + Prima</p><p className="text-xl font-bold">8.33% / 8.33%</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-6 flex items-center gap-4">
          <div className="rounded-xl bg-yellow-50 text-yellow-600 p-3"><FileText className="h-5 w-5" /></div>
          <div><p className="text-xs text-muted-foreground">Deducciones Ley</p><p className="text-xl font-bold">4% Salud + 4% Pensión</p></div>
        </CardContent></Card>
      </div>


      <div className="flex gap-2 mb-4 border-b border-slate-200 pb-2">
        <Button variant={activeTab === "history" ? "default" : "ghost"} onClick={() => setActiveTab("history")}><History className="mr-2 h-4 w-4" /> Historial de Nóminas</Button>
        <Button variant={activeTab === "pending" ? "default" : "ghost"} onClick={() => setActiveTab("pending")}><TrendingUp className="mr-2 h-4 w-4" /> Liquidación Pendiente (Tiempo Real)</Button>
      </div>

      {activeTab === "history" && (
        <Card>
        <CardHeader>
          <CardTitle>Períodos de Nómina y Liquidación</CardTitle>
          <CardDescription>Gestión de liquidación según tipos de contrato (Término Fijo, Indefinido, Obra u Labor, Por Horas, Prestación de Servicios, Aprendizaje SENA)</CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre del Período</TableHead>
                <TableHead>Año</TableHead>
                <TableHead>Mes</TableHead>
                <TableHead>Inicio</TableHead>
                <TableHead>Fin</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Cargando períodos...</TableCell></TableRow>
              ) : periods.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No hay períodos registrados. Haga clic en 'Nuevo Período' para comenzar.</TableCell></TableRow>
              ) : (
                periods.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{p.year}</TableCell>
                    <TableCell>{p.month}</TableCell>
                    <TableCell className="text-sm">{p.start_date}</TableCell>
                    <TableCell className="text-sm">{p.end_date}</TableCell>
                    <TableCell>
                      <Badge variant={p.status === "closed" ? "secondary" : "default"}>
                        {p.status === "closed" ? "Cerrado" : "Abierto / Borrador"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="outline" size="sm" onClick={() => openCalculateModal(p)}>
                        <Play className="h-3.5 w-3.5 mr-1 text-green-600" />Calcular Nómina
                      </Button>
                      {p.status !== "closed" && (
                        <Button variant="secondary" size="sm" onClick={() => handleClosePeriod(p.id)}>
                          Cerrar Período
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>


      )}

      {activeTab === "pending" && (
        <Card>
          <CardHeader>
            <CardTitle>Reporte de Liquidación Pendiente</CardTitle>
            <CardDescription>Resumen en tiempo real de lo adeudado a los empleados según su estado de turnos y salario fijo.</CardDescription>
            <div className="flex items-end gap-3 pt-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Desde</label>
                <Input type="date" value={reportDates.start} onChange={(e) => setReportDates({...reportDates, start: e.target.value})} className="h-9 w-40" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Hasta</label>
                <Input type="date" value={reportDates.end} onChange={(e) => setReportDates({...reportDates, end: e.target.value})} className="h-9 w-40" />
              </div>
              <Button onClick={loadPendingReport}><Search className="mr-2 h-4 w-4" /> Consultar</Button>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Tipo Salario / Base</TableHead>
                  <TableHead>Turnos (C/P/SA)</TableHead>
                  <TableHead>Horas Laboradas</TableHead>
                  <TableHead>Devengado Base</TableHead>
                  <TableHead>Extras / Recargos</TableHead>
                  <TableHead>Deducciones</TableHead>
                  <TableHead>Costo Empleador (Parafiscales)</TableHead>
                  <TableHead>Total a Pagar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingReport ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Calculando liquidación pendiente...</TableCell></TableRow>
                ) : pendingReport.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No hay datos en el rango seleccionado.</TableCell></TableRow>
                ) : (
                  pendingReport.map((r) => (
                    <TableRow key={r.employee_id}>
                      <TableCell>
                        <div className="font-bold">{r.full_name}</div>
                        <div className="text-xs text-muted-foreground font-mono">{r.document}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="mb-1">{r.salary_type}</Badge>
                        <div className="text-xs text-muted-foreground">${Number(r.base_salary || 0).toLocaleString("es-CO")}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs space-y-0.5">
                          <div className="text-green-600 font-bold">Completados: {r.status_counts.completed || 0}</div>
                          <div className="text-red-600 font-bold">Perdidos: {r.status_counts.lost || 0}</div>
                          <div className="text-orange-600 font-bold">Salida Antici.: {r.status_counts.salida_anticipada || 0}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-semibold">{r.total_worked_hours} h</div>
                        <div className="text-xs text-muted-foreground">Extras: {r.total_overtime_hours} h</div>
                      </TableCell>
                      <TableCell className="text-blue-700 font-semibold">${Number(r.accrued_base).toLocaleString("es-CO")}</TableCell>
                      <TableCell className="text-green-700 font-semibold">+${Number(r.extras_sundays_holidays).toLocaleString("es-CO")}</TableCell>
                      <TableCell className="text-red-600 font-semibold">-${Number(r.deductions).toLocaleString("es-CO")}</TableCell>
                      <TableCell className="text-purple-700 font-semibold">
                        <div className="text-sm">${Number(r.total_employer_cost || 0).toLocaleString("es-CO")}</div>
                        <div className="text-xs text-muted-foreground">+${Number(r.employer_parafiscals || 0).toLocaleString("es-CO")} paraf.</div>
                      </TableCell>
                      <TableCell className="text-emerald-700 font-black text-lg">${Number(r.total_to_pay).toLocaleString("es-CO")}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Diálogo Crear Período */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nuevo Período de Nómina</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Nombre del Período</label>
              <Input value={newPeriod.name} onChange={(e) => setNewPeriod({ ...newPeriod, name: e.target.value })} className="h-9 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Año</label>
                <Input type="number" value={newPeriod.year} onChange={(e) => setNewPeriod({ ...newPeriod, year: Number(e.target.value) })} className="h-9 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Mes</label>
                <Input type="number" value={newPeriod.month} onChange={(e) => setNewPeriod({ ...newPeriod, month: Number(e.target.value) })} className="h-9 text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Fecha Inicio</label>
                <Input type="date" value={newPeriod.start_date} onChange={(e) => setNewPeriod({ ...newPeriod, start_date: e.target.value })} className="h-9 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Fecha Fin</label>
                <Input type="date" value={newPeriod.end_date} onChange={(e) => setNewPeriod({ ...newPeriod, end_date: e.target.value })} className="h-9 text-sm" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" size="sm">Cancelar</Button></DialogClose>
            <Button size="sm" onClick={handleCreatePeriod}>Crear Período</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo Detalle de Liquidación por Tipo de Contrato */}
      <Dialog open={calcOpen} onOpenChange={setCalcOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Liquidación de Nómina - {selectedPeriod?.name}</DialogTitle>
          </DialogHeader>
          {calculating ? (
            <div className="py-12 text-center text-muted-foreground">Ejecutando motor de liquidación ley colombiana...</div>
          ) : (
            <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empleado</TableHead>
                    <TableHead>Código Contrato</TableHead>
                    <TableHead>Salario Base</TableHead>
                    <TableHead>Devengado Total</TableHead>
                    <TableHead>Deducciones Ley (4%+4%)</TableHead>
                    <TableHead>Costo Empleador (Total)</TableHead>
                    <TableHead>Neto a Pagar</TableHead>
                    <TableHead>Prestaciones Sociales</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {calcResults.length === 0 ? (
                    <TableRow><TableCell colSpan={9} className="text-center py-6 text-muted-foreground">No hay contratos activos para liquidar en este período</TableCell></TableRow>
                  ) : (
                    calcResults.map(({ contract, result }, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{contract.employee_name}</TableCell>
                        <TableCell className="font-mono text-xs">{contract.code}</TableCell>
                        <TableCell className="text-sm">${Number(contract.salary).toLocaleString("es-CO")}</TableCell>
                        <TableCell className="text-sm font-semibold text-green-700">${Number(result.total_earnings || 0).toLocaleString("es-CO")}</TableCell>
                        <TableCell className="text-sm text-red-600">${Number(result.total_deductions || 0).toLocaleString("es-CO")}</TableCell>
                        <TableCell className="text-sm font-semibold text-purple-700">${Number(result.total_employer_cost || 0).toLocaleString("es-CO")}</TableCell>
                        <TableCell className="text-sm font-bold text-blue-900">${Number(result.net_pay || 0).toLocaleString("es-CO")}</TableCell>
                        <TableCell className="text-xs">
                          {result.social_benefits ? (
                            <div>
                              <p>Cesantías: ${Number(result.social_benefits.cesantias || 0).toLocaleString("es-CO")}</p>
                              <p>Prima: ${Number(result.social_benefits.prima || 0).toLocaleString("es-CO")}</p>
                            </div>
                          ) : (
                            "No aplica"
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" onClick={() => handlePrint({ contract, result }, selectedPeriod)}>
                            <Printer className="h-4 w-4 mr-1 text-slate-600" /> Imprimir Cobro
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" size="sm">Cerrar</Button></DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
      
      {/* Print Template (Only visible when printing) */}
      <div className="hidden print:block absolute inset-0 z-[99999] bg-white text-black p-0 m-0 w-full">
        {printData && (
          <CuentaDeCobroTemplate 
            ref={printRef}
            employee={printData.employee}
            company={printData.company}
            period={printData.period}
            amount={printData.amount}
          />
        )}
      </div>

    </div>
  );
}
