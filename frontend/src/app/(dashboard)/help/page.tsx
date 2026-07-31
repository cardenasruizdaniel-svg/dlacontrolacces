"use client";
import React, { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen, Search, Users, FileText, DollarSign, Building2, Calendar,
  MapPin, Shield, Camera, Settings, Smartphone, Bot, BarChart3,
  CheckCircle2, ArrowRight, Lightbulb, AlertTriangle, ChevronDown, ChevronUp, Sparkles, HelpCircle, Layers, Award
} from "lucide-react";

interface ManualSection {
  id: string;
  category: string;
  title: string;
  icon: any;
  badge: string;
  badgeVariant?: "default" | "secondary" | "outline" | "success";
  linkHref: string;
  linkLabel: string;
  summary: string;
  steps: string[];
  tips?: string[];
  keywords: string[];
}

const manualSections: ManualSection[] = [
  {
    id: "sec-login",
    category: "Acceso & Seguridad",
    title: "1. Inicio de Sesión, Credenciales y Autenticación MFA",
    icon: Shield,
    badge: "Seguridad",
    badgeVariant: "default",
    linkHref: "/login",
    linkLabel: "Ir a Login",
    summary: "Guía completa para ingresar al sistema de forma segura, gestionar su contraseña y configurar la autenticación de dos factores (MFA).",
    steps: [
      "Ingrese a la dirección web del portal (ej: http://localhost:3000/login o la URL del servidor).",
      "Ingrese su correo electrónico corporativo registrado (ej: admin@dlaredes.com.co) y su contraseña.",
      "Si tiene habilitada la Autenticación MFA (Doble Factor), introduzca el código dinámico de 6 dígitos generado por su aplicación (Google Authenticator o Microsoft Authenticator).",
      "Si es su primer inicio de sesión o ingresa con una clave temporal, el sistema le solicitará cambiar la contraseña inmediatamente según las políticas de complejidad de DLA.",
      "Para cerrar sesión de manera segura, haga clic en el avatar de usuario en la esquina superior derecha y seleccione 'Cerrar Sesión'."
    ],
    tips: [
      "Nunca comparta su clave de acceso. Cada usuario queda registrado en la bitácora de auditoría con su IP y marca de tiempo.",
      "Las cuentas se bloquean automáticamente tras 5 intentos fallidos consecutivos por protección anti-fuerza bruta."
    ],
    keywords: ["login", "ingreso", "contraseña", "mfa", "clave", "doble factor", "seguridad", "bloqueo"]
  },
  {
    id: "sec-employees",
    category: "Talento Humano",
    title: "2. Gestión de Empleados, Biometría Facial y Catálogos",
    icon: Users,
    badge: "Talento Humano",
    badgeVariant: "secondary",
    linkHref: "/employees",
    linkLabel: "Ir a Gestión de Empleados",
    summary: "Cómo registrar, editar y administrar la ficha de los empleados de la empresa, asignar fotos de referencia biométrica y vincular las entidades de seguridad social.",
    steps: [
      "Vaya al módulo 'Gestión de Empleados' desde el menú lateral.",
      "Para registrar un nuevo colaborador, haga clic en el botón 'Nuevo Empleado'.",
      "Complete el formulario en sus pestañas: Datos Personales (Cédula, Nombre, Email, Teléfono), Ubicación (Departamento y Ciudad del catálogo oficial de Colombia) y Seguridad Social (Seleccione EPS, ARL y AFP de los listados desplegables ya creados).",
      "Foto de Referencia Biométrica: En el formulario del empleado, active la cámara o suba una foto clara del rostro del colaborador. Esta foto servirá como patrón de comparación para el reconocimiento facial en el ingreso laboral.",
      "Asignación de Credenciales: Active la casilla 'Permitir Acceso a Plataforma' y defina el nombre de usuario y rol asignado.",
      "Para modificar datos existentes o consultar la ficha completa, ubique al empleado en el buscador y presione 'Editar'."
    ],
    tips: [
      "Los selectores de Ciudad, Departamento, EPS, ARL y AFP son desplegables precargados con la totalidad de municipios de Colombia. Si falta alguna entidad específica, puede agregarla en la sección 'Configuración' -> 'Tablas Maestras'.",
      "Asegúrese de que la foto biométrica tenga buena iluminación y el rostro esté centrado para optimizar la velocidad del reconocimiento facial."
    ],
    keywords: ["empleado", "crear empleado", "biometría", "foto", "eps", "arl", "afp", "departamento", "ciudad", "colombia", "editar"]
  },
  {
    id: "sec-contracts",
    category: "Nómina & Contratos",
    title: "3. Creación de Contratos Laborales según Ley Colombiana",
    icon: FileText,
    badge: "Contratos",
    badgeVariant: "outline",
    linkHref: "/contracts",
    linkLabel: "Ir a Contratos Laborales",
    summary: "Guía para vincular empleados a contratos formales. El sistema genera automáticamente el código de contrato y adapta el esquema de cobro y liquidación.",
    steps: [
      "Acceda al módulo 'Contratos Laborales'.",
      "Haga clic en 'Nuevo Contrato'. Seleccione el empleado deseado del listado.",
      "Generación Automática de Código: El sistema genera dinámicamente el código único combinando el código de empleado y su número de cédula.",
      "Datos de Seguridad Social: Al seleccionar el empleado, el contrato trae automáticamente la EPS, ARL y AFP que le fueron asignadas al momento de su creación.",
      "Tipo de Contrato: Elija la modalidad según la norma colombiana (Término Fijo, Término Indefinido, Obra o Labor, Prestación de Servicios).",
      "Esquema Laboral y Dinámica de Título: Si el esquema de trabajo se marca como 'Por Horas', el campo de salario cambia automáticamente su nombre a 'Valor de la Hora'. Si es 'Obra o Labor', cambia a 'Valor Total del Contrato', informando al usuario sobre cómo se calculará la liquidación."
    ],
    tips: [
      "El valor configurado en este apartado es la base que tomará el módulo de Nómina para realizar el cálculo exacto de horas ordinarias, recargos y prestaciones sociales."
    ],
    keywords: ["contrato", "nuevo contrato", "término fijo", "indefinido", "obra labor", "por horas", "salario", "valor hora", "código contrato"]
  },
  {
    id: "sec-payroll",
    category: "Nómina & Contratos",
    title: "4. Liquidación de Nómina con Legislación Colombiana 2024",
    icon: DollarSign,
    badge: "Nómina",
    badgeVariant: "success",
    linkHref: "/payroll",
    linkLabel: "Ir a Nómina y Liquidación",
    summary: "Cómo aperturar periodos de nómina y ejecutar la liquidación automática aplicando recargos nocturnos, horas extras, dominicales y deducciones de ley.",
    steps: [
      "Ingrese a 'Nómina y Liquidación'.",
      "Aperture un periodo de pago seleccionando la fecha inicial, fecha final y tipo (Quincenal o Mensual).",
      "Haga clic en 'Calcular Nómina'. El motor financiero tomará automáticamente cada contrato activo y sus marcaciones de turno aprobadas.",
      "Fórmulas de Ley Aplicadas Automáticamente:",
      " - Salud (4%) y Pensión (4%) de deducción al empleado.",
      " - Auxilio de Transporte (para salarios inferiores a 2 SMMLV).",
      " - Recargo Nocturno (35%), Festivo/Dominical (75%) y Nocturno Dominical (110%).",
      " - Horas Extras Diurnas (1.25x), Nocturnas (1.75x) y Festivas (2.0x).",
      " - Provisiones de Prestaciones Social: Cesantías (8.33%), Prima de Servicios (8.33%) e Intereses sobre Cesantías (12%).",
      "Revise la grilla de resumen por empleado, descargue el desprendible en PDF/Excel o proceda al Cierre de Nómina."
    ],
    tips: [
      "Si el contrato está configurado en esquema 'Por Horas', la nómina calculará el salario devengado multiplicando las horas reales laboradas registradas en la App Móvil por el valor de la hora asignado."
    ],
    keywords: ["nómina", "liquidación", "recargo nocturno", "horas extras", "festivo", "salud", "pensión", "cesantías", "prima", "ley colombiana"]
  },
  {
    id: "sec-clients",
    category: "Operaciones & Geolocalización",
    title: "5. Gestión de Clientes, Sedes y Georreferenciación GPS",
    icon: Building2,
    badge: "Clientes & Sedes",
    badgeVariant: "secondary",
    linkHref: "/clients",
    linkLabel: "Ir a Clientes y Sedes",
    summary: "Registro de clientes de la empresa, creación de sedes con geolocalización por dirección o botón GPS y comparación de radio para la App Móvil.",
    steps: [
      "Ingrese al módulo 'Clientes y Sedes'.",
      "Haga clic en 'Nuevo Cliente' o ingrese a un cliente existente para administrar sus sedes.",
      "Ubicación por Catálogo: Seleccione el Departamento y Ciudad de la sede desde las listas desplegables nacionales.",
      "Georreferenciación Automática por Dirección: Ingrese la dirección física de la sede y haga clic en 'Ubicar en Mapa'. El sistema utilizará la API de geocodificación para obtener automáticamente las coordenadas latitud/longitud precisas y mostrarlas en el mapa interactivo.",
      "Captura GPS en Sitio: Si se encuentra físicamente en la sede del cliente con una laptop o tablet con GPS, presione 'Capturar Mi Ubicación Actual'.",
      "Guarde los cambios de la sede. Estas coordenadas serán la referencia exacta que usará la App Móvil para validar que el vigilante/empleado se encuentra dentro del rango al iniciar turno."
    ],
    tips: [
      "Puede consultar o ajustar la clave comercial de Google Maps en el módulo de Configuración. Si la clave no está presente, el sistema funciona de manera transparente con OpenStreetMap sin costo adicional."
    ],
    keywords: ["cliente", "sedes", "georreferenciación", "coordenadas", "latitud", "longitud", "mapa", "ubicar", "gps", "geocerca"]
  },
  {
    id: "sec-scheduling",
    category: "Operaciones & Geolocalización",
    title: "6. Programación de Turnos, Cuadrantes y Series Recurrentes",
    icon: Calendar,
    badge: "Turnos",
    badgeVariant: "outline",
    linkHref: "/scheduling",
    linkLabel: "Ir a Programación de Turnos",
    summary: "Asignación de turnos a empleados en las sedes de los clientes, creación de plantillas de horario y control de solapamientos.",
    steps: [
      "Vaya al módulo 'Programación de Turnos'.",
      "Seleccione la vista en Calendario (Diario, Semanal o Mensual).",
      "Haga clic en 'Programar Turno' o en una celda del calendario.",
      "Elija el Empleado, el Cliente y la Sede correspondiente.",
      "Establezca la fecha, hora de inicio y hora de finalización del turno (ej: Turno 2x2x2, 6:00 AM a 6:00 PM).",
      "Para turnos repetitivos, active 'Serie Recurrente' indicando los días de la semana y la fecha de finalización.",
      "El sistema validará automáticamente que el empleado no tenga turnos duplicados o cruzados a la misma hora."
    ],
    tips: [
      "Cree 'Plantillas de Turno' en la pestaña secundaria para asignar cuadrantes completos en segundos."
    ],
    keywords: ["turnos", "programación", "cuadrante", "vigilancia", "calendario", "horario", "series", "plantillas"]
  },
  {
    id: "sec-mobile",
    category: "App Móvil PWA & Campo",
    title: "7. Aplicación Móvil PWA: Marcación, Biometría y Modo Offline",
    icon: Smartphone,
    badge: "PWA Móvil",
    badgeVariant: "success",
    linkHref: "/mobile-preview",
    linkLabel: "Ver Simulador PWA Móvil",
    summary: "Procedimiento operativo para que los empleados de campo registren inicio y fin de turno en dispositivos móviles con validación biométrica y almacenamiento offline.",
    steps: [
      "Instalación de la PWA: Abra el navegador del celular (Chrome o Safari) e ingrese a la URL del sistema. Presione 'Agregar a la pantalla de inicio' para instalar la aplicación como PWA sin necesidad de App Store/Play Store.",
      "Acceso Directo Móvil: Al abrir la app en un dispositivo móvil, el sistema carga directamente la pantalla de inicio de turno.",
      "Inicio de Turno:",
      " 1. La app obtiene la posición GPS actual del teléfono y la compara en metros contra las coordenadas de la sede asignada.",
      " 2. La app activa la cámara frontal y solicita la selfie de verificación biométrica facial.",
      " 3. Si la posición está dentro del radio permitido (ej. 100m) y el rostro coincide con la foto referencial del empleado, el turno se inicia exitosamente.",
      "Funcionamiento SIN INTERNET (Modo Offline): Si el colaborador se encuentra en una zona sin cobertura celular, la marcación se guardará de forma segura en la base de datos local del navegador (IndexedDB). Tan pronto el dispositivo recupere señal de red, la cola se sincronizará automáticamente con el servidor preservando la fecha y hora original."
    ],
    tips: [
      "El indicador de estado en la app mostrará un ícono verde 'En Línea' o naranja 'Modo Offline (Pendientes Sync)' informando el estado de la conexión en todo momento."
    ],
    keywords: ["móvil", "pwa", "marcación", "entrada", "salida", "offline", "sin internet", "indexeddb", "selfie", "reconocimiento facial", "gps"]
  },
  {
    id: "sec-settings",
    category: "Configuración & Sistema",
    title: "8. Configuración Centralizada, Google Maps y Tablas Maestras",
    icon: Settings,
    badge: "Configuración",
    badgeVariant: "default",
    linkHref: "/settings",
    linkLabel: "Ir a Configuración del Sistema",
    summary: "Administración de variables globales del sistema, llaves de API de Google Maps, parámetros de geocerca y catálogos de Colombia.",
    steps: [
      "Acceda al módulo 'Configuración'.",
      "Integración & Variables del Sistema:",
      " - GOOGLE_MAPS_API_KEY: Ingrese la llave de API comercial obtenida en Google Cloud Console para habilitar las capas de mapas interactivos. Si se deja en blanco, la plataforma conmuta automáticamente a OpenStreetMap.",
      " - GEOFENCE_RADIUS_METERS: Defina el margen de distancia permitido en metros (ej: 100m) para que los supervisores o empleados inicien turno.",
      " - FACE_RECOGNITION_TOLERANCE: Ajuste el umbral de similitud para la comparación de rostros (ej: 0.60).",
      "Tablas Maestras de Colombia: En las pestañas de Departamentos, Ciudades, EPS, ARL y AFP, puede agregar, modificar o eliminar entidades de los catálogos nacionales.",
      "Datos de la Empresa: Configure la Razón Social, NIT, Email y Teléfono corporativo para que aparezcan impresos en los recibos de nómina."
    ],
    tips: [
      "Cada campo de configuración incluye una tarjeta descriptiva con la explicación detallada de la variable y su impacto en el sistema."
    ],
    keywords: ["configuración", "google maps", "api key", "geocerca", "tolerancia facial", "tablas maestras", "eps", "arl", "afp", "empresa", "nit"]
  },
  {
    id: "sec-ai-reports",
    category: "Reportes e Inteligencia",
    title: "9. Asistente Virtual con IA y Exportación de Reportes",
    icon: Bot,
    badge: "Inteligencia IA",
    badgeVariant: "secondary",
    linkHref: "/ai-assistant",
    linkLabel: "Ir al Asistente IA",
    summary: "Uso del asistente conversacional en lenguaje natural para obtener analítica instantánea y exportar reportes ejecutivos a Excel.",
    steps: [
      "Asistente IA ('/ai-assistant'): Escriba preguntas en lenguaje cotidiano como '¿Cuántos empleados tenemos en turno hoy?', '¿Cuál es el costo total de la nómina de este mes?' o 'Muéstrame la lista de vigilantes con ARL Sura'. El asistente procesará la base de datos y le responderá de forma estructurada.",
      "Reportes e Impresión ('/reports'): Seleccione la categoría de reporte (Nómina, Asistencia, Empleados, Bitácora de Geocercas), aplique los filtros de fechas y presione 'Exportar a Excel' o 'Generar PDF'."
    ],
    tips: [
      "El asistente de IA cuenta con contexto de la legislación laboral colombiana y de la estructura de turnos de DLA Access Enterprise."
    ],
    keywords: ["asistente ia", "inteligencia artificial", "preguntas", "reportes", "excel", "pdf", "asistencia", "bitácora"]
  }
];

export default function HelpCenterPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("Todos");
  const [expandedSection, setExpandedSection] = useState<string | null>("sec-login");

  const categories = ["Todos", "Acceso & Seguridad", "Talento Humano", "Nómina & Contratos", "Operaciones & Geolocalización", "App Móvil PWA & Campo", "Configuración & Sistema"];

  const filteredSections = manualSections.filter((sec) => {
    const matchesCategory = activeCategory === "Todos" || sec.category === activeCategory;
    const searchLower = searchTerm.toLowerCase().trim();
    if (!searchLower) return matchesCategory;

    const matchesTitle = sec.title.toLowerCase().includes(searchLower);
    const matchesSummary = sec.summary.toLowerCase().includes(searchLower);
    const matchesKeywords = sec.keywords.some((k) => k.toLowerCase().includes(searchLower));
    const matchesSteps = sec.steps.some((step) => step.toLowerCase().includes(searchLower));

    return matchesCategory && (matchesTitle || matchesSummary || matchesKeywords || matchesSteps);
  });

  const toggleExpand = (id: string) => {
    setExpandedSection(expandedSection === id ? null : id);
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-8 text-white shadow-xl">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-300 backdrop-blur-md border border-blue-400/30">
            <BookOpen className="h-3.5 w-3.5" /> Manual de Funcionamiento & Guía de Usuario
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Centro de Ayuda y Manual Operativo DLA Access
          </h1>
          <p className="text-sm sm:text-base text-blue-100/90 leading-relaxed">
            Consulte la guía completa de procedimientos, normativa laboral colombiana, uso de la App Móvil PWA offline, geolocalización GPS, contratos y configuración de variables del sistema.
          </p>

          {/* Search Bar inside Header */}
          <div className="pt-2">
            <div className="relative max-w-xl">
              <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
              <Input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="¿Qué desea aprender a hacer? Ej: 'crear empleado', 'nómina', 'Google Maps', 'PWA offline'..."
                className="pl-10 pr-4 py-6 bg-white/10 backdrop-blur-md text-white placeholder:text-slate-300 border-white/20 rounded-xl focus-visible:ring-2 focus-visible:ring-blue-400"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3.5 top-3.5 text-xs text-slate-300 hover:text-white bg-slate-800/60 px-2 py-1 rounded"
                >
                  Limpiar
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="absolute right-[-20px] bottom-[-30px] opacity-10 pointer-events-none">
          <Layers className="h-80 w-80 text-white" />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b">
        {categories.map((cat) => (
          <Button
            key={cat}
            variant={activeCategory === cat ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveCategory(cat)}
            className="rounded-full text-xs font-semibold whitespace-nowrap"
          >
            {cat}
          </Button>
        ))}
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Mostrando <span className="font-bold text-gray-900">{filteredSections.length}</span> módulos y guías {activeCategory !== "Todos" && `en '${activeCategory}'`}
        </p>
        <Button variant="ghost" size="sm" onClick={() => { setSearchTerm(""); setActiveCategory("Todos"); }} className="text-xs text-blue-600">
          Restablecer filtros
        </Button>
      </div>

      {/* Manual Sections Accordion / Cards List */}
      {filteredSections.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <HelpCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-gray-800">No se encontraron resultados</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            No encontramos guías que coincidan con &quot;{searchTerm}&quot;. Intente buscar con palabras más generales como &apos;empleado&apos;, &apos;nómina&apos;, &apos;gps&apos; o &apos;turnos&apos;.
          </p>
          <Button className="mt-4 bg-blue-600 hover:bg-blue-700" onClick={() => { setSearchTerm(""); setActiveCategory("Todos"); }}>
            Ver Todas las Guías
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredSections.map((sec) => {
            const isExpanded = expandedSection === sec.id;
            const IconComp = sec.icon;

            return (
              <Card
                key={sec.id}
                className={`transition-all duration-200 border ${isExpanded ? "border-blue-500 shadow-md bg-blue-50/10" : "hover:border-gray-300"}`}
              >
                <CardHeader className="cursor-pointer py-4" onClick={() => toggleExpand(sec.id)}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl text-white ${isExpanded ? "bg-blue-600" : "bg-slate-700"}`}>
                        <IconComp className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <Badge variant={sec.badgeVariant || "default"} className="text-[10px]">
                            {sec.badge}
                          </Badge>
                          <span className="text-xs text-muted-foreground font-medium">{sec.category}</span>
                        </div>
                        <CardTitle className="text-lg text-gray-900">{sec.title}</CardTitle>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link href={sec.linkHref} onClick={(e) => e.stopPropagation()}>
                        <Button size="sm" variant="outline" className="hidden sm:flex items-center gap-1 text-xs text-blue-600 border-blue-200 hover:bg-blue-50">
                          {sec.linkLabel} <ArrowRight className="h-3 w-3" />
                        </Button>
                      </Link>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500">
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <CardDescription className="text-sm text-gray-600 pt-2">
                    {sec.summary}
                  </CardDescription>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="pt-0 pb-6 border-t mt-2 space-y-4">
                    {/* Direct link button mobile */}
                    <div className="flex sm:hidden pt-3">
                      <Link href={sec.linkHref} className="w-full">
                        <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700 text-xs">
                          {sec.linkLabel} <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                      </Link>
                    </div>

                    {/* Step by step */}
                    <div className="space-y-3 pt-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-green-600" /> Procedimiento Paso a Paso:
                      </h4>
                      <div className="bg-white p-4 rounded-xl border space-y-2">
                        {sec.steps.map((step, idx) => (
                          <div key={idx} className="flex items-start gap-2.5 text-sm text-gray-800">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-800 text-[11px] font-bold mt-0.5">
                              {idx + 1}
                            </span>
                            <p className="leading-relaxed">{step}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Practical Tips */}
                    {sec.tips && sec.tips.length > 0 && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 space-y-1.5">
                        <h4 className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                          <Lightbulb className="h-4 w-4 text-amber-600" /> Consejos Operativos & Recomendaciones:
                        </h4>
                        <ul className="list-disc list-inside text-xs text-amber-900/90 space-y-1 pl-1">
                          {sec.tips.map((tip, idx) => (
                            <li key={idx}>{tip}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Quick Support & Help Card */}
      <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-600 text-white rounded-xl">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-blue-950">¿Necesita asistencia guiada en tiempo real?</h3>
              <p className="text-xs text-blue-800">
                Puede consultar directamente al Asistente Virtual con Inteligencia Artificial para resolver inquietudes en lenguaje natural.
              </p>
            </div>
          </div>
          <Link href="/ai-assistant">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap text-xs">
              <Bot className="h-4 w-4 mr-2" /> Consultar al Asistente IA
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
