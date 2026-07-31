"use client";
import React, { useState } from "react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, Send, Search, BarChart3, AlertTriangle, Route } from "lucide-react";

export default function AIAssistantPage() {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<{ role: string; content: string; data?: any }[]>([
    { role: "assistant", content: "Hola, soy el asistente inteligente de DLA Access Enterprise. Puedo ayudarte con: buscar empleados, analizar productividad, detectar anomalías, predecir ausencias y optimizar rutas. ¿Qué necesitas?" },
  ]);
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!query.trim()) return;
    const userMsg = { role: "user", content: query };
    setMessages((prev) => [...prev, userMsg]);
    setQuery("");
    setLoading(true);
    try {
      const companyId = localStorage.getItem("company_id") || "";
      const res = await api.post("/ai/query", { company_id: companyId, query: userMsg.content });
      setMessages((prev) => [...prev, { role: "assistant", content: res.data.response, data: res.data.data }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Lo siento, hubo un error al procesar tu consulta." }]);
    }
    setLoading(false);
  };

  const suggestions = [
    { label: "Buscar empleados", icon: Search, query: "Buscar empleado: Juan" },
    { label: "Anomalías", icon: AlertTriangle, query: "Mostrar ausencias y anomalías" },
    { label: "Productividad", icon: BarChart3, query: "Analizar productividad" },
    { label: "Optimizar rutas", icon: Route, query: "Optimizar rutas de campo" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Asistente IA</h1>
        <p className="text-muted-foreground">Inteligencia artificial para análisis y toma de decisiones</p>
      </div>
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="md:col-span-3">
          <CardHeader><CardTitle className="flex items-center gap-2"><Bot className="h-5 w-5" />Chat</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[400px] overflow-y-auto space-y-4 mb-4 p-4 bg-muted/30 rounded-lg">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-lg p-3 ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-card border"}`}>
                    <p className="text-sm">{msg.content}</p>
                  </div>
                </div>
              ))}
              {loading && <div className="text-center text-muted-foreground text-sm">Procesando...</div>}
            </div>
            <div className="flex gap-2">
              <Input placeholder="Escriba su consulta..." value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSend()} />
              <Button onClick={handleSend} disabled={loading}><Send className="h-4 w-4" /></Button>
            </div>
          </CardContent>
        </Card>
        <div className="space-y-3">
          <h3 className="font-medium text-sm text-muted-foreground">Sugerencias</h3>
          {suggestions.map((s) => (
            <Button key={s.label} variant="outline" className="w-full justify-start" onClick={() => { setQuery(s.query); }}>
              <s.icon className="mr-2 h-4 w-4" />{s.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
