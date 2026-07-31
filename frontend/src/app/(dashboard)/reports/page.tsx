"use client";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Table, BarChart3, Download, Users, DollarSign, Clock } from "lucide-react";

const reports = [
  { title: "Reporte de Nómina", description: "Nómina detallada por período con desglose completo", icon: DollarSign, color: "text-green-600" },
  { title: "Reporte de Asistencia", description: "Registro de entrada/salida por empleado", icon: Clock, color: "text-blue-600" },
  { title: "Reporte de Empleados", description: "Listado completo del personal activo", icon: Users, color: "text-purple-600" },
  { title: "Productividad", description: "Análisis de productividad y cumplimiento", icon: BarChart3, color: "text-yellow-600" },
  { title: "Contratos", description: "Estado de contratos laborales", icon: FileText, color: "text-red-600" },
  { title: "Accesos", description: "Historial de accesos y geolocalización", icon: Table, color: "text-indigo-600" },
];

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reportes</h1>
          <p className="text-muted-foreground">Generación de reportes en PDF, Excel y Power BI Ready</p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {reports.map((report) => (
          <Card key={report.title} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className={`rounded-lg bg-muted p-2`}><report.icon className={`h-5 w-5 ${report.color}`} /></div>
                <div>
                  <CardTitle className="text-base">{report.title}</CardTitle>
                  <CardDescription className="text-xs">{report.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1"><FileText className="mr-1 h-3 w-3" />PDF</Button>
                <Button variant="outline" size="sm" className="flex-1"><Table className="mr-1 h-3 w-3" />Excel</Button>
                <Button variant="outline" size="sm"><Download className="h-3 w-3" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
