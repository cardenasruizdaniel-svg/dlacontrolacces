"use client";
import React, { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Plus, Search, Pencil, Trash2, Eye, AlertCircle, CheckCircle2, Download, Upload, FileText, FileSpreadsheet, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";

// Complete official dataset of Colombian Departments and All Municipalities
const DEFAULT_DEPARTMENTS = [
  "Amazonas", "Antioquia", "Arauca", "Atlántico", "Bogotá D.C.", "Bolívar", "Boyacá", "Caldas",
  "Caquetá", "Casanare", "Cauca", "Cesar", "Chocó", "Córdoba", "Cundinamarca", "Guainía",
  "Guaviare", "Huila", "La Guajira", "Magdalena", "Meta", "Nariño", "Norte de Santander",
  "Putumayo", "Quindío", "Risaralda", "San Andrés y Providencia", "Santander", "Sucre",
  "Tolima", "Valle del Cauca", "Vaupés", "Vichada"
];

const COLOMBIAN_CITIES_BY_DEPT: Record<string, string[]> = {
  "Amazonas": ["Leticia", "Puerto Nariño", "La Chorrera", "El Encanto", "Puerto Alegría", "Puerto Arica", "Puerto Santander", "Tarapacá"],
  "Antioquia": [
    "Medellín", "Abejorral", "Abriaquí", "Alejandría", "Amagá", "Amalfi", "Andes", "Angelópolis", "Angostura", "Anorí",
    "Santa Fe de Antioquia", "Anzá", "Apartadó", "Arboletes", "Argelia", "Armenia", "Barbosa", "Bello", "Belmira", "Betania",
    "Betulia", "Ciudad Bolívar", "Briceño", "Buriticá", "Cáceres", "Caicedo", "Caldas", "Campamento", "Cañasgordas", "Caracolí",
    "Caramanta", "Carepa", "El Carmen de Viboral", "Carolina", "Caucasia", "Chigorodó", "Cisneros", "Cocorná", "Concepción", "Concordia",
    "Copacabana", "Dabeiba", "Donmatías", "Ebéjico", "El Bagre", "Entrerríos", "Envigado", "Fredonia", "Frontino", "Giraldo",
    "Girardota", "Gómez Plata", "Granada", "Guadalupe", "Guarne", "Guatapé", "Heliconia", "Hispania", "Itagüí", "Ituango",
    "Jardín", "Jericó", "La Ceja", "La Estrella", "La Pintada", "La Unión", "Liborina", "Maceo", "Marinilla", "Montebello",
    "Murindó", "Mutatá", "Nariño", "Nechí", "Necoclí", "Olaya", "Peñol", "Peque", "Pueblorrico", "Puerto Berrío",
    "Puerto Nare", "Puerto Triunfo", "Remedios", "Retiro", "Rionegro", "Sabanalarga", "Sabaneta", "Salgar", "San Andrés de Cuerquia", "San Carlos",
    "San Francisco", "San Jerónimo", "San José de la Montaña", "San Juan de Urabá", "San Luis", "San Pedro de los Milagros", "San Pedro de Urabá", "San Rafael", "San Roque", "San Vicente Ferrer",
    "Santa Bárbara", "Santa Rosa de Osos", "Santo Domingo", "El Santuario", "Segovia", "Sonsón", "Sopetrán", "Táamesis", "Tarazá", "Tarso",
    "Titiribí", "Toledo", "Turbo", "Uramita", "Urrao", "Valdivia", "Valparaíso", "Vegachí", "Venecia", "Vigía del Fuerte",
    "Yalí", "Yarumal", "Yolombó", "Yondó", "Zaragoza"
  ],
  "Arauca": ["Arauca", "Arauquita", "Cravo Norte", "Fortul", "Puerto Rondón", "Saravena", "Tame"],
  "Atlántico": [
    "Barranquilla", "Baranoa", "Campo de la Cruz", "Candelaria", "Galapa", "Juan de Acosta", "Luruaco", "Malambo", "Manatí", "Palmar de Varela",
    "Piojó", "Polonuevo", "Ponedera", "Puerto Colombia", "Repelón", "Sabanagrande", "Sabanalarga", "Santa Lucía", "Santo Tomás", "Soledad",
    "Suan", "Tubará", "Usiacurí"
  ],
  "Bogotá D.C.": ["Bogotá D.C."],
  "Bolívar": [
    "Cartagena de Indias", "Achí", "Altos del Rosario", "Arenal", "Arjona", "Arroyohondo", "Barranco de Loba", "Calamar", "Cantagallo", "Cicuco",
    "Clemencia", "Córdoba", "El Carmen de Bolívar", "El Guamo", "El Peñón", "Hatillo de Loba", "Magangué", "Mahates", "Margarita", "María La Baja",
    "Montecristo", "Mompós", "Morales", "Norosí", "Pinillos", "Regidor", "Río Viejo", "San Cristóbal", "San Estanislao", "San Fernando",
    "San Jacinto", "San Jacinto del Cauca", "San Juan Nepomuceno", "San Martín de Loba", "San Pablo", "Santa Catalina", "Santa Rosa", "Santa Rosa del Sur",
    "Simití", "Soplaviento", "Talaigua Nuevo", "Tiquisio", "Turbaco", "Turbaná", "Villanueva", "Zambrano"
  ],
  "Boyacá": [
    "Tunja", "Almeida", "Aquitania", "Arcabuco", "Belén", "Berbeo", "Betéitiva", "Boavita", "Buenavista", "Busbanzá",
    "Caldas", "Campohermoso", "Cerinza", "Chinavita", "Chiquinquirá", "Chíscas", "Chita", "Chitaraque", "Chivatá", "Ciénega",
    "Cómbita", "Coper", "Corrales", "Covarachía", "Cubará", "Cucaita", "Cuítiva", "Duitama", "El Cocuy", "El Espino",
    "Firavitoba", "Floresta", "Gachantivá", "Gámeza", "Garagoa", "Guacamayas", "Guateque", "Guayatá", "Güicán", "Izá",
    "Jenesano", "Jericó", "Labranzagrande", "La Capilla", "La Victoria", "La Uvita", "Villa de Leyva", "Macanal", "Maripí", "Miraflores",
    "Mongua", "Monguí", "Moniquirá", "Motavita", "Muzo", "Nobsa", "Nuevo Colón", "Oicatá", "Otanche", "Pachavita",
    "Páez", "Paipa", "Pajarito", "Panqueba", "Pauna", "Paya", "Paz de Río", "Pesca", "Pisba", "Puerto Boyacá",
    "Quípama", "Ramiriquí", "Ráquira", "Rondón", "Saboyá", "Sáchica", "Samacá", "San Eduardo", "San Mateo", "San Miguel de Sema",
    "San José de Pare", "San Luis de Gaceno", "Santa Sofía", "Santa María", "Santa Rosa de Viterbo", "Siachoque", "Soatá", "Socha",
    "Socotá", "Sogamoso", "Somondoco", "Sora", "Sotaquirá", "Soracá", "Susacón", "Sutamarchán", "Sutatenza", "Tasco",
    "Tenza", "Tibaná", "Tibasosa", "Tinjacá", "Tipacoque", "Toca", "Togüí", "Tota", "Tununguá", "Turmequé",
    "Tuta", "Tutazá", "Úmbita", "Ventaquemada", "Viracachá", "Zetaquira"
  ],
  "Caldas": [
    "Manizales", "Aguadas", "Anserma", "Aranzazu", "Belalcázar", "Chinchiná", "Filadelfia", "La Dorada", "La Merced", "Manzanares",
    "Marmato", "Marquetalia", "Marulanda", "Neira", "Norcasia", "Pácora", "Palestina", "Pensilvania", "Riosucio", "Risaralda",
    "Salamina", "Samaná", "San José", "Supía", "Victoria", "Villamaría", "Viterbo"
  ],
  "Caquetá": [
    "Florencia", "Albania", "Belén de los Andaquíes", "Cartagena del Chairá", "Curillo", "El Doncello", "El Paujil", "La Montañita", "Milán", "Morelia",
    "Puerto Rico", "San José del Fragua", "San Vicente del Caguán", "Solano", "Solita", "Valparaíso"
  ],
  "Casanare": [
    "Yopal", "Aguazul", "Chámeza", "Hato Corozal", "La Salina", "Maní", "Monterrey", "Nunchía", "Orocué", "Paz de Ariporo",
    "Pore", "Recetor", "Sabanalarga", "Sácama", "San Luis de Palenque", "Támara", "Tauramena", "Trinidad", "Villanueva"
  ],
  "Cauca": [
    "Popayán", "Almaguer", "Argelia", "Balboa", "Bolívar", "Buenos Aires", "Cajibío", "Caldono", "Caloto", "Corinto",
    "El Tambo", "Florencia", "Guachené", "Guapí", "Inzá", "Jambaló", "La Sierra", "La Vega", "López de Micay", "Mercaderes",
    "Miranda", "Morales", "Padilla", "Páez", "Piamonte", "Piendamó", "Puerto Tejada", "Puracé", "Rosas", "San Sebastián",
    "Santa Rosa", "Santander de Quilichao", "Silvia", "Sotará", "Suárez", "Sucre", "Timbío", "Timbiquí", "Toribío", "Totoró", "Villa Rica"
  ],
  "Cesar": [
    "Valledupar", "Aguachica", "Agustín Codazzi", "Astrea", "Becerril", "Bosconia", "Chimichagua", "Chiriguaná", "Curumaní", "El Copey",
    "El Paso", "Gamarra", "González", "La Gloria", "La Paz", "Manaure Balcón del Cesar", "Pailitas", "Pelaya", "Pueblo Bello", "Río de Oro",
    "La Jagua de Ibirico", "San Alberto", "San Diego", "San Martín", "Tamalameque"
  ],
  "Chocó": [
    "Quibdó", "Acandí", "Alto Baudó", "Atrato", "Bagadó", "Bahía Solano", "Bajo Baudó", "Bojayá", "El Cantón del San Pablo", "Carmen del Darién",
    "Cértegui", "Condoto", "El Carmen de Atrato", "El Litoral del San Juan", "Istmina", "Juradó", "Lloró", "Medio Atrato", "Medio Baudó", "Medio San Juan",
    "Nóvita", "Nuquí", "Río Iró", "Río Quito", "Riosucio", "San José del Palmar", "Sipí", "Tadó", "Unguía", "Unión Panamericana"
  ],
  "Córdoba": [
    "Montería", "Ayapel", "Buenavista", "Canalete", "Cereté", "Chimá", "Chinú", "Ciénaga de Oro", "Cotorra", "La Apartada",
    "Lorica", "Los Córdobas", "Momil", "Montelíbano", "Moñitos", "Planeta Rica", "Pueblo Nuevo", "Puerto Escondido", "Puerto Libertador", "Purísima",
    "Sahagún", "San Andrés de Sotavento", "San Antero", "San Bernardo del Viento", "San Carlos", "San José de Uré", "San Pelayo", "Tierralta", "Tuchín", "Valencia"
  ],
  "Cundinamarca": [
    "Soacha", "Chía", "Zipaquirá", "Fusagasugá", "Facatativá", "Mosquera", "Madrid", "Funza", "Cajicá", "Girardot",
    "Agua de Dios", "Albán", "Anapoima", "Anolaima", "Apulo", "Arbeláez", "Beltrán", "Bituima", "Bojacá", "Cabrera",
    "Cachipay", "Caparrapí", "Cáqueza", "Carmen de Carupa", "Chaguaní", "Chipaque", "Choachí", "Chocontá", "Cogua", "Cota",
    "Cucunubá", "El Colegio", "El Peñón", "El Rosal", "Fómeque", "Fosca", "Fúquene", "Gachalá", "Gachancipá", "Gachetá",
    "Gama", "Granada", "Guachetá", "Guaduas", "Guasca", "Guataquí", "Guatavita", "Guayabal de Síquima", "Guayabetal", "Gutiérrez",
    "Jerusalén", "Junín", "La Calera", "La Mesa", "La Palma", "La Peña", "La Vega", "Lenguazaque", "Machetá", "Manta",
    "Medina", "Nariño", "Nemocón", "Nilo", "Nimaima", "Nocaima", "Venecia", "Pacho", "Paime", "Pandi", "Paratebueno",
    "Pasca", "Puerto Salgar", "Pulí", "Quebradanegra", "Quetame", "Quipile", "Ricaurte", "San Antonio del Tequendama", "San Bernardo", "San Cayetano",
    "San Francisco", "San Juan de Rioseco", "Sasaima", "Sesquilé", "Sibaté", "Silvania", "Simijaca", "Sopó", "Subachoque", "Suesca",
    "Susa", "Sutatausa", "Tabio", "Tausa", "Tena", "Tenjo", "Tibacuy", "Tibirita", "Tocaima", "Tocancipá", "Topaipí",
    "Ubalá", "Ubaque", "Villa de San Diego de Ubaté", "Une", "Útica", "Vergara", "Vianí", "Villagómez", "Villapinzón", "Villeta",
    "Viotá", "Yacopí", "Zipacón"
  ],
  "Guainía": ["Inírida", "Barrancominas", "Mapiripana", "San Felipe", "Puerto Colombia", "La Guadalupe", "Cacahual", "Pana Pana", "Morichal"],
  "Guaviare": ["San José del Guaviare", "Calamar", "El Retorno", "Miraflores"],
  "Huila": [
    "Neiva", "Acevedo", "Agrado", "Aipe", "Algeciras", "Altamira", "Baraya", "Campoalegre", "Colombia", "Elías",
    "Garzón", "Gigante", "Guadalupe", "Hobo", "Íquira", "Isnos", "La Argentina", "La Plata", "Nátaga", "Oporapa",
    "Paicol", "Palermo", "Palestina", "Pital", "Pitalito", "Rivera", "Saladoblanco", "San Agustín", "Santa María", "Suaza",
    "Tarqui", "Tesalia", "Tello", "Teruel", "Timaná", "Villavieja", "Yaguará"
  ],
  "La Guajira": [
    "Riohacha", "Albania", "Barrancas", "Dibulla", "Distracción", "El Molino", "Fonseca", "Hatonuevo", "La Jagua del Pilar", "Maicao",
    "Manaure", "San Juan del Cesar", "Uribia", "Urumita", "Villanueva"
  ],
  "Magdalena": [
    "Santa Marta", "Algarrobo", "Aracataca", "Ariguaní", "Cerro de San Antonio", "Chibolo", "Ciénaga", "El Banco", "El Piñón", "El Retén",
    "Fundación", "Guamal", "Nueva Granada", "Pedraza", "Pijiño del Carmen", "Pivijay", "Plato", "Puebloviejo", "Remolino", "Sabanas de San Ángel",
    "Salamina", "San Zenón", "San Sebastián de Buenavista", "Sitionuevo", "Tenerife", "Zapayán", "Zona Bananera"
  ],
  "Meta": [
    "Villavicencio", "Acacías", "Barranca de Upía", "Cabuyaro", "Castilla la Nueva", "Cubarral", "Cumaral", "El Calvario", "El Castillo", "El Dorado",
    "Fuente de Oro", "Granada", "Guamal", "La Macarena", "Lejanías", "Mapiripán", "Mesetas", "La Uribe", "Puerto Concordia", "Puerto Gaitán",
    "Puerto López", "Puerto Lleras", "Puerto Rico", "Restrepo", "San Carlos de Guaroa", "San Juan de Arama", "San Juanito", "San Martín", "Vista Hermosa"
  ],
  "Nariño": [
    "Pasto", "Albán", "Aldana", "Ancuyá", "Arboleda", "Barbacoas", "Belén", "Buesaco", "Colón", "Consacá",
    "Contadero", "Córdoba", "Cuaspud", "Cumbal", "Cumbitara", "Chachagüí", "El Charco", "El Peñol", "El Rosario", "El Tablón de Gómez",
    "El Tambo", "Funes", "Guachucal", "Guaitarilla", "Gualmatán", "Iles", "Imués", "Ipiales", "La Cruz", "La Florida",
    "La Llanada", "La Tola", "La Unión", "Leiva", "Linares", "Los Andes", "Magüí", "Mallama", "Mosquera", "Nariño",
    "Olaya Herrera", "Ospina", "Francisco Pizarro", "Policarpa", "Puerres", "Pupiales", "Ricaurte", "Roberto Payán", "Samaniego", "Sandoná",
    "San Bernardo", "San Lorenzo", "San Pablo", "San Pedro de Cartago", "Santa Bárbara", "Santacruz", "Sapuyes", "Taminango", "Tangua", "San Andrés de Tumaco",
    "Túquerres", "Yacuanquer"
  ],
  "Norte de Santander": [
    "Cúcuta", "Ábrego", "Arboledas", "Bochalema", "Bucarasica", "Cachirá", "Cácota", "Chinácota", "Chitagá", "Convención",
    "Cúcutilla", "Durania", "El Carmen", "El Tarra", "El Zulia", "Gramalote", "Hacarí", "Herrán", "Labateca", "La Esperanza",
    "La Playa", "Los Patios", "Lourdes", "Mutiscua", "Ocaña", "Pamplona", "Pamplonita", "Puerto Santander", "Ragonvalia", "Salazar",
    "San Calixto", "San Cayetano", "Santiago", "Sardinata", "Silos", "Teorama", "Tibú", "Toledo", "Villa Caro", "Villa del Rosario"
  ],
  "Putumayo": ["Mocoa", "Colón", "Orito", "Puerto Asís", "Puerto Caicedo", "Puerto Guzmán", "Puerto Leguízamo", "Sibundoy", "San Francisco", "San Miguel", "Santiago", "Valle del Guamuez", "Villagarzón"],
  "Quindío": ["Armenia", "Buenavista", "Calarcá", "Circasia", "Córdoba", "Filandia", "Génova", "La Tebaida", "Montenegro", "Pijao", "Quimbaya", "Salento"],
  "Risaralda": ["Pereira", "Apía", "Balboa", "Belén de Umbría", "Dosquebradas", "Guática", "La Celia", "La Virginia", "Marsella", "Mistrató", "Pueblo Rico", "Quinchía", "Santa Rosa de Cabal", "Santuario"],
  "San Andrés y Providencia": ["San Andrés", "Providencia"],
  "Santander": [
    "Bucaramanga", "Floridablanca", "Girón", "Piedecuesta", "Barrancabermeja", "Aguada", "Albania", "Aratoca", "Barbosa", "Barichara",
    "Betulia", "Bolívar", "Cabrera", "California", "Capitanejo", "Carcasí", "Cepitá", "Cerrito", "Charalá", "Charta",
    "Chima", "Chipatá", "Cimitarra", "Concepción", "Confines", "Contratación", "Coromoro", "Curití", "El Carmen de Chucurí", "El Guacamayo",
    "El Peñón", "El Playón", "Encino", "Enciso", "Galán", "Gámbita", "Guaca", "Guadalupe", "Guapotá", "Guavatá",
    "Güepsa", "Hato", "Jesús María", "Jordán", "Landázuri", "La Belleza", "La Paz", "Lebrija", "Los Santos", "Macaravita",
    "Málaga", "Matanza", "Mogotes", "Molagavita", "Ocamonte", "Oiba", "Onzaga", "Palmar", "Palmas del Socorro", "Pinchote",
    "Puente Nacional", "Puerto Parra", "Puerto Wilches", "Rionegro", "Sabana de Torres", "San Andrés", "San Benito", "San Gil", "San Joaquín", "San José de Miranda",
    "San Miguel", "San Vicente de Chucurí", "Santa Bárbara", "Santa Helena del Opón", "Simacota", "Socorro", "Suaita", "Sucre", "Suratá", "Tona",
    "Valle de San José", "Vélez", "Vetas", "Villanueva", "Zapatoca"
  ],
  "Sucre": [
    "Sincelejo", "Buenavista", "Caimito", "Colosó", "Corozal", "Coveñas", "Chalán", "El Roble", "Galeras", "Guaranda",
    "La Unión", "Los Palmitos", "Majagual", "Morroa", "Ovejas", "Palmito", "Sampués", "San Benito Abad", "San Juan de Betulia", "San Marcos",
    "San Onofre", "San Pedro", "Sincé", "Sucre", "Tolú", "Tolú Viejo"
  ],
  "Tolima": [
    "Ibagué", "Alpujarra", "Alvarado", "Ambalema", "Anzoátegui", "Armero Guayabal", "Ataco", "Cajamarca", "Carmen de Apicalá", "Casabianca",
    "Chaparral", "Coello", "Coyaíma", "Cundai", "Dolores", "Espinal", "Falan", "Flandes", "Fresno", "Guamo",
    "Herveo", "Honda", "Icononzo", "Lérida", "Líbano", "San Sebastián de Mariquita", "Melgar", "Murillo", "Natagaima", "Ortega",
    "Palocabildo", "Piedras", "Planadas", "Prado", "Purificación", "Rioblanco", "Roncesvalles", "Rovira", "Saldaña", "San Antonio",
    "San Luis", "Santa Isabel", "Suárez", "Valle de San Juan", "Venadillo", "Villahermosa", "Villarrica"
  ],
  "Valle del Cauca": [
    "Cali", "Alcalá", "Andalucía", "Ansermanuevo", "Argelia", "Bolívar", "Buenaventura", "Guadalajara de Buga", "Bugalagrande", "Caicedonia",
    "Calima", "Candelaria", "Cartago", "Dagua", "El Águila", "El Cairo", "El Cerrito", "El Dovio", "Florida", "Ginebra",
    "Guacarí", "Jamundí", "La Cumbre", "La Unión", "La Victoria", "Obando", "Palmira", "Pradera", "Restrepo", "Riofrío",
    "Roldanillo", "San Pedro", "Sevilla", "Toro", "Trujillo", "Tuluá", "Ulloa", "Versalles", "Vijes", "Yotoco",
    "Yumbo", "Zarzal"
  ],
  "Vaupés": ["Mitú", "Carurú", "Pacoa", "Taraira", "Papunahua", "Yavaraté"],
  "Vichada": ["Puerto Carreño", "La Primavera", "Santa Rosalía", "Cumaribo"]
};

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

const FALLBACK_ROLES = [
  { id: "fallback-superadmin", name: "Super Admin", display_name: "Super Administrador" },
  { id: "fallback-gerencia", name: "Gerencia", display_name: "Gerencia" },
  { id: "fallback-administracion", name: "Administración", display_name: "Administración" },
  { id: "fallback-supervisor", name: "Supervisor", display_name: "Supervisor" },
  { id: "fallback-auditor", name: "Auditor", display_name: "Auditor" },
  { id: "fallback-administrativo", name: "Administrativo", display_name: "Administrativo" },
  { id: "fallback-medico", name: "Médico", display_name: "Médico" },
  { id: "fallback-enfermero", name: "Enfermero", display_name: "Enfermero" },
  { id: "fallback-cuidador", name: "Cuidador", display_name: "Cuidador" },
];

const emptyEmployee: Record<string, any> = {
  company_id: "",
  code: "",
  document_type: "CC",
  document_number: "",
  first_name: "",
  middle_name: "",
  last_name: "",
  second_last_name: "",
  email: "",
  phone: "",
  mobile: "",
  address: "",
  department_loc: "Quindío",
  city: "Armenia",
  department_id: "",
  job_position_id: "",
  hire_date: "",
  eps: "EPS Sura",
  arl: "Positiva Compañía de Seguros (ARL Positiva)",
  afp: "Porvenir S.A.",
  status: "active",
  username: "",
  password: "",
  role_id: "",
  platform_access: "both",
};

function EmployeeForm({
  data, onChange, roles, catalogs, editing
}: {
  data: any; onChange: (d: any) => void; roles?: any[]; catalogs?: any; editing?: any;
}) {
  const set = (k: string, v: any) => onChange({ ...data, [k]: v });

  const [usernameStatus, setUsernameStatus] = useState<{
    checking: boolean;
    available?: boolean;
    message?: string;
  }>({ checking: false });

  useEffect(() => {
    const rawUsername = data.username ? String(data.username).trim() : "";
    if (!rawUsername || rawUsername.length < 3) {
      setUsernameStatus({ checking: false });
      return;
    }

    if (editing && editing.username && rawUsername.toLowerCase() === String(editing.username).trim().toLowerCase()) {
      setUsernameStatus({ checking: false, available: true, message: "Nombre de usuario actual" });
      return;
    }

    setUsernameStatus({ checking: true });
    const timer = setTimeout(async () => {
      try {
        const excludeParam = editing?.id ? `&exclude_id=${editing.id}` : "";
        const res = await api.get(`/auth/check-username?username=${encodeURIComponent(rawUsername)}${excludeParam}`);
        setUsernameStatus({
          checking: false,
          available: res.data.available,
          message: res.data.message,
        });
      } catch {
        setUsernameStatus({ checking: false });
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [data.username, editing]);

  // Full name calculation
  const fullName = [data.first_name, data.middle_name, data.last_name, data.second_last_name]
    .filter(Boolean)
    .join(" ");

  const departmentsList = catalogs?.departments?.length ? catalogs.departments.map((d: any) => d.name || d) : DEFAULT_DEPARTMENTS;
  const epsList = catalogs?.eps?.length ? catalogs.eps.map((e: any) => e.name || e) : DEFAULT_EPS;
  const arlList = catalogs?.arl?.length ? catalogs.arl.map((a: any) => a.name || a) : DEFAULT_ARL;
  const afpList = catalogs?.afp?.length ? catalogs.afp.map((a: any) => a.name || a) : DEFAULT_AFP;

  // Filter municipalities by selected department
  const selectedDept = data.department_loc || "Quindío";
  const availableCities = COLOMBIAN_CITIES_BY_DEPT[selectedDept] || (
    catalogs?.cities?.length
      ? catalogs.cities.filter((c: any) => !c.department || c.department === selectedDept).map((c: any) => c.name || c)
      : ["Armenia"]
  );

  const field = (label: string, key: string, opts?: { type?: string; required?: boolean; half?: boolean; placeholder?: string }) => (
    <div className={opts?.half ? "flex-1" : "w-full"}>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label} {opts?.required && <span className="text-red-500">*</span>}</label>
      <Input
        type={opts?.type || "text"}
        value={data[key] || ""}
        onChange={(e) => set(key, e.target.value)}
        required={opts?.required}
        placeholder={opts?.placeholder || ""}
        className="h-9 text-sm"
      />
    </div>
  );

  return (
    <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
      {/* Datos del documento */}
      <div>
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Datos del documento</h4>
        <div className="flex gap-3">
          <div className="w-36">
            <label className="block text-xs font-medium text-gray-500 mb-1">Tipo de Doc <span className="text-red-500">*</span></label>
            <select
              className="flex h-9 w-full rounded-md border bg-background px-3 py-1.5 text-sm"
              value={data.document_type || "CC"}
              onChange={(e) => set("document_type", e.target.value)}
            >
              <option value="CC">Cédula Ciudadanía</option>
              <option value="TI">Tarjeta Identidad</option>
              <option value="CE">Cédula Extranjería</option>
              <option value="PA">Pasaporte</option>
              <option value="NIT">NIT</option>
            </select>
          </div>
          {field("Número de documento", "document_number", { required: true, placeholder: "Ej: 1234567890" })}
          {field("Código empleado", "code", { required: true, placeholder: "Ej: EMP-001" })}
        </div>
      </div>

      {/* Nombres y Apellidos */}
      <div>
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Nombres y Apellidos</h4>
        <div className="grid grid-cols-2 gap-3 mb-3">
          {field("Primer nombre", "first_name", { required: true, placeholder: "Ej: Juan" })}
          {field("Segundo nombre", "middle_name", { placeholder: "Ej: Carlos" })}
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          {field("Primer apellido", "last_name", { required: true, placeholder: "Ej: Pérez" })}
          {field("Segundo apellido", "second_last_name", { placeholder: "Ej: López" })}
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
          <label className="block text-xs font-medium text-blue-600 mb-1">Nombre completo (Vista Previa)</label>
          <p className="text-sm font-semibold text-blue-900">{fullName || "—"}</p>
        </div>

        {/* Foto de Perfil / Referencial Biometría Facial App Móvil */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
            Foto Referencial Biometría Facial (App Móvil)
          </label>
          <div className="flex items-center gap-4">
            <div className="relative h-20 w-20 rounded-full overflow-hidden border-2 border-blue-500 bg-slate-200 flex-shrink-0 flex items-center justify-center shadow-sm">
              {data.photo_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img 
                  src={data.photo_url.startsWith("http") || data.photo_url.startsWith("data:") ? data.photo_url : `data:image/jpeg;base64,${data.photo_url}`} 
                  alt="Foto Referencial Empleado" 
                  className="h-full w-full object-cover" 
                />
              ) : (
                <span className="text-xs font-bold text-slate-400 uppercase">Sin foto</span>
              )}
            </div>
            <div className="flex-1 space-y-1.5">
              {data.photo_url && (data.photo_url.startsWith("data:") || data.photo_url.length > 200) ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-emerald-50 border border-emerald-200">
                    <span className="text-emerald-600 text-lg">✅</span>
                    <div>
                      <p className="text-xs font-semibold text-emerald-700">Foto biométrica registrada</p>
                      <p className="text-[10px] text-emerald-600">Registrada desde la App Móvil. Para reemplazarla, suba una nueva imagen.</p>
                    </div>
                  </div>
                  <label className="block text-[11px] font-medium text-slate-600">Reemplazar foto (opcional)</label>
                  <input
                    type="file"
                    accept="image/*"
                    className="block w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          set("photo_url", reader.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </div>
              ) : (
                <div className="flex-1 space-y-1.5">
                  <label className="block text-[11px] font-medium text-slate-600">Subir imagen desde equipo o pegar URL directa de la foto</label>
                  <input
                    type="file"
                    accept="image/*"
                    className="block w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          set("photo_url", reader.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  <Input
                    type="text"
                    placeholder="O pegar URL directa https://..."
                    value={data.photo_url && data.photo_url.length < 200 ? data.photo_url : ""}
                    onChange={(e) => set("photo_url", e.target.value)}
                    className="h-8 text-xs font-mono bg-white"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Ubicación y Contacto con Selector de Departamento y Ciudad */}
      <div>
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Ubicación y Contacto</h4>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Departamento</label>
            <select
              className="flex h-9 w-full rounded-md border bg-background px-3 py-1.5 text-sm"
              value={data.department_loc || "Quindío"}
              onChange={(e) => {
                const newDept = e.target.value;
                set("department_loc", newDept);
                const firstCity = COLOMBIAN_CITIES_BY_DEPT[newDept]?.[0] || "";
                set("city", firstCity);
              }}
            >
              {departmentsList.map((dep: string) => (
                <option key={dep} value={dep}>{dep}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Ciudad / Municipio</label>
            <select
              className="flex h-9 w-full rounded-md border bg-background px-3 py-1.5 text-sm"
              value={data.city || ""}
              onChange={(e) => set("city", e.target.value)}
            >
              {availableCities.map((city: string) => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {field("Email", "email", { type: "email", placeholder: "correo@ejemplo.com" })}
          {field("Celular / WhatsApp", "mobile", { placeholder: "+57 300 000 0000" })}
        </div>
      </div>

      {/* Información Laboral & Seguridad Social */}
      <div>
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Información Laboral & Seguridad Social</h4>
        <div className="grid grid-cols-2 gap-3 mb-3">
          {field("Fecha de ingreso", "hire_date", { type: "date" })}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Estado</label>
            <select
              className="flex h-9 w-full rounded-md border bg-background px-3 py-1.5 text-sm"
              value={data.status || "active"}
              onChange={(e) => set("status", e.target.value)}
            >
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
              <option value="terminated">Retirado</option>
              <option value="suspended">Suspendido</option>
            </select>
          </div>
        </div>

        {/* EPS, ARL, AFP Dropdowns */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">EPS (Salud)</label>
            <select
              className="flex h-9 w-full rounded-md border bg-background px-3 py-1.5 text-sm"
              value={data.eps || ""}
              onChange={(e) => set("eps", e.target.value)}
            >
              <option value="">Seleccione EPS...</option>
              {epsList.map((e: string) => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">ARL (Riesgos)</label>
            <select
              className="flex h-9 w-full rounded-md border bg-background px-3 py-1.5 text-sm"
              value={data.arl || ""}
              onChange={(e) => set("arl", e.target.value)}
            >
              <option value="">Seleccione ARL...</option>
              {arlList.map((a: string) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">AFP (Pensión)</label>
            <select
              className="flex h-9 w-full rounded-md border bg-background px-3 py-1.5 text-sm"
              value={data.afp || ""}
              onChange={(e) => set("afp", e.target.value)}
            >
              <option value="">Seleccione AFP...</option>
              {afpList.map((f: string) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Acceso al Sistema */}
      <div className="border-t pt-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Acceso al Sistema</h4>
          {editing && editing.has_access && (
            <Badge variant="default" className="text-xs">
              Cuenta activa - {editing.username}
            </Badge>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Usuario {!editing && <span className="text-red-500">*</span>}</label>
            <div className="relative">
              <Input
                placeholder="nombre.usuario"
                value={data.username || ""}
                onChange={(e) => set("username", e.target.value)}
                className={`h-9 text-sm pr-8 ${
                  usernameStatus.available === true
                    ? "border-emerald-500 focus-visible:ring-emerald-500"
                    : usernameStatus.available === false
                    ? "border-red-500 focus-visible:ring-red-500"
                    : ""
                }`}
              />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                {usernameStatus.checking && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
                {!usernameStatus.checking && usernameStatus.available === true && (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                )}
                {!usernameStatus.checking && usernameStatus.available === false && (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                )}
              </div>
            </div>
            {data.username && String(data.username).trim().length >= 3 && (
              <p
                className={`text-[11px] mt-1 font-medium ${
                  usernameStatus.checking
                    ? "text-slate-400"
                    : usernameStatus.available === true
                    ? "text-emerald-600"
                    : "text-red-600"
                }`}
              >
                {usernameStatus.checking
                  ? "Verificando disponibilidad..."
                  : usernameStatus.message || (usernameStatus.available ? "Usuario disponible" : "Usuario no disponible")}
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              {editing && editing.has_access ? "Nueva contraseña (vacío = mantener)" : "Contraseña *"}
            </label>
            <Input
              type="password"
              placeholder={editing && editing.has_access ? "Dejar vacío si no desea cambiar" : "Mínimo 8 caracteres"}
              value={data.password || ""}
              onChange={(e) => set("password", e.target.value)}
              className="h-9 text-sm"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Rol / Perfil</label>
            <select
              className="flex h-9 w-full rounded-md border bg-background px-3 py-1.5 text-sm"
              value={data.role_id || ""}
              onChange={(e) => set("role_id", e.target.value)}
            >
              <option value="">Sin rol asignado</option>
              {(roles || []).map((r: any) => <option key={r.id} value={r.id}>{r.display_name || r.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Acceso a plataforma</label>
            <select
              className="flex h-9 w-full rounded-md border bg-background px-3 py-1.5 text-sm"
              value={data.platform_access || "both"}
              onChange={(e) => set("platform_access", e.target.value)}
            >
              <option value="both">Web y App Móvil</option>
              <option value="web">Solo Web (ERP)</option>
              <option value="mobile">Solo App Móvil</option>
              <option value="none">Sin acceso</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0, terminated: 0 });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ ...emptyEmployee });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [viewOpen, setViewOpen] = useState(false);
  const [viewData, setViewData] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [roles, setRoles] = useState<any[]>([]);
  const [catalogs, setCatalogs] = useState<any>({
    departments: DEFAULT_DEPARTMENTS,
    cities: [],
    eps: DEFAULT_EPS,
    arl: DEFAULT_ARL,
    afp: DEFAULT_AFP,
  });
  const [existingAccess, setExistingAccess] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Bulk Import State
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importRows, setImportRows] = useState<any[]>([]);
  const [importFileName, setImportFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const companyId = (typeof window !== "undefined" ? localStorage.getItem("company_id") : null) || "dla-company-main";

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFileName(file.name);
    setImportResult(null);

    const isExcel = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");
    const reader = new FileReader();

    if (isExcel) {
      reader.onload = (evt) => {
        try {
          const data = new Uint8Array(evt.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const rawRows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

          if (rawRows.length === 0) {
            showToast("error", "El archivo Excel no contiene filas de datos.");
            return;
          }

          const normalized = rawRows.map((row) => {
            const clean: any = {};
            for (const [key, val] of Object.entries(row)) {
              const k = key.trim().toLowerCase();
              if (k === "middle_name" || k.includes("segundo nombre") || k.includes("segundo_nombre")) clean["middle_name"] = String(val).trim();
              else if (k === "second_last_name" || k.includes("segundo apellido") || k.includes("segundo_apellido")) clean["second_last_name"] = String(val).trim();
              else if (k === "first_name" || k.includes("primer nombre") || k.includes("nombre")) clean["first_name"] = String(val).trim();
              else if (k === "last_name" || k.includes("primer apellido") || k.includes("apellido")) clean["last_name"] = String(val).trim();
              else if (k.includes("code") || k.includes("código") || k.includes("codigo")) clean["code"] = String(val).trim();
              else if (k.includes("document_type") || k.includes("tipo doc") || k.includes("tipo_doc")) clean["document_type"] = String(val).trim();
              else if (k.includes("document_number") || k.includes("documento") || k.includes("cédula") || k.includes("cedula")) clean["document_number"] = String(val).trim();
              else if (k.includes("email") || k.includes("correo")) clean["email"] = String(val).trim();
              else if (k.includes("mobile") || k.includes("celular")) clean["mobile"] = String(val).trim();
              else if (k.includes("phone") || k.includes("teléfono") || k.includes("telefono")) clean["phone"] = String(val).trim();
              else if (k.includes("address") || k.includes("dirección") || k.includes("direccion")) clean["address"] = String(val).trim();
              else if (k.includes("department_loc") || k.includes("departamento ubicación") || k.includes("depto")) clean["department_loc"] = String(val).trim();
              else if (k.includes("city") || k.includes("ciudad") || k.includes("municipio")) clean["city"] = String(val).trim();
              else if (k.includes("job_position") || k.includes("cargo") || k.includes("puesto")) clean["job_position"] = String(val).trim();
              else if (k.includes("department") || k.includes("departamento") || k.includes("área") || k.includes("area")) clean["department"] = String(val).trim();
              else if (k.includes("hire_date") || k.includes("fecha ingreso") || k.includes("fecha contrataci")) clean["hire_date"] = String(val).trim();
              else if (k.includes("birth_date") || k.includes("fecha nacimiento")) clean["birth_date"] = String(val).trim();
              else if (k.includes("gender") || k.includes("género") || k.includes("genero") || k.includes("sexo")) clean["gender"] = String(val).trim();
              else if (k.includes("blood_type") || k.includes("grupo sanguíneo") || k.includes("rh")) clean["blood_type"] = String(val).trim();
              else if (k.includes("marital_status") || k.includes("estado civil")) clean["marital_status"] = String(val).trim();
              else if (k.includes("eps")) clean["eps"] = String(val).trim();
              else if (k.includes("arl")) clean["arl"] = String(val).trim();
              else if (k.includes("afp") || k.includes("pension") || k.includes("pensión")) clean["afp"] = String(val).trim();
              else if (k.includes("caja")) clean["caja_compensacion"] = String(val).trim();
              else if (k.includes("emergency_contact_name") || k.includes("contacto emergencia")) clean["emergency_contact_name"] = String(val).trim();
              else if (k.includes("emergency_contact_phone") || k.includes("teléfono emergencia") || k.includes("celular emergencia")) clean["emergency_contact_phone"] = String(val).trim();
              else if (k.includes("emergency_contact_relation") || k.includes("parentesco")) clean["emergency_contact_relation"] = String(val).trim();
              else if (k.includes("bank_name") || k.includes("banco")) clean["bank_name"] = String(val).trim();
              else if (k.includes("bank_account_type") || k.includes("tipo cuenta")) clean["bank_account_type"] = String(val).trim();
              else if (k.includes("bank_account_number") || k.includes("número cuenta") || k.includes("numero cuenta")) clean["bank_account_number"] = String(val).trim();
              else if (k.includes("username") || k.includes("usuario")) clean["username"] = String(val).trim();
              else if (k.includes("password") || k.includes("contraseña") || k.includes("clave")) clean["password"] = String(val).trim();
              else if (k.includes("platform_access") || k.includes("acceso")) clean["platform_access"] = String(val).trim();
              else if (k.includes("status") || k.includes("estado")) clean["status"] = String(val).trim();
              else clean[key.trim()] = String(val).trim();
            }
            return clean;
          });

          setImportRows(normalized);
          showToast("success", `Archivo Excel procesado: ${normalized.length} registros listos.`);
        } catch (err: any) {
          showToast("error", "Error al leer el archivo Excel: " + err.message);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      reader.onload = (evt) => {
        try {
          const text = evt.target?.result as string;
          const workbook = XLSX.read(text, { type: "string" });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const rawRows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

          if (rawRows.length === 0) {
            showToast("error", "El archivo CSV no contiene filas de datos.");
            return;
          }

          const normalized = rawRows.map((row) => {
            const clean: any = {};
            for (const [key, val] of Object.entries(row)) {
              clean[key.trim()] = String(val).trim();
            }
            return clean;
          });

          setImportRows(normalized);
          showToast("success", `Archivo CSV procesado: ${normalized.length} registros listos.`);
        } catch (err: any) {
          showToast("error", "Error al leer el archivo CSV: " + err.message);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleConfirmImport = async () => {
    if (importRows.length === 0) return;
    setImporting(true);
    try {
      const res = await api.post("/employees/import", {
        company_id: companyId,
        employees: importRows,
      });
      setImportResult(res.data);
      showToast("success", `Importación completada: ${res.data.created_count} creados, ${res.data.skipped_count} omitidos.`);
      loadEmployees();
      loadStats();
    } catch (err: any) {
      showToast("error", err?.response?.data?.detail || "Error en la importación masiva");
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadEmployeesTemplate = async () => {
    try {
      const res = await api.get("/employees/template", { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "plantilla_empleados_deacontrol.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();
      showToast("success", "Plantilla Excel descargada correctamente");
    } catch (err) {
      showToast("error", "Error al descargar plantilla");
    }
  };

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/employees`, { params: { company_id: companyId, search, page_size: 100 } });
      setEmployees(res.data.items || []);
      setTotal(res.data.total || 0);
    } catch {
      setEmployees([]);
    }
    setLoading(false);
  }, [companyId, search]);

  const loadStats = useCallback(async () => {
    try {
      const res = await api.get(`/employees/stats/summary`, { params: { company_id: companyId } });
      setStats(res.data);
    } catch {}
  }, [companyId]);

  const loadRoles = useCallback(async () => {
    try {
      const res = await api.get(`/iam/roles`);
      const items = res.data.items || res.data || [];
      if (items.length > 0) {
        setRoles(items);
      } else {
        setRoles(FALLBACK_ROLES);
      }
    } catch {
      setRoles(FALLBACK_ROLES);
    }
  }, []);

  const loadCatalogs = useCallback(async () => {
    try {
      const [depRes, cityRes, epsRes, arlRes, afpRes] = await Promise.allSettled([
        api.get("/catalogs/departments"),
        api.get("/catalogs/cities"),
        api.get("/catalogs/eps"),
        api.get("/catalogs/arl"),
        api.get("/catalogs/afp"),
      ]);
      setCatalogs({
        departments: depRes.status === "fulfilled" ? depRes.value.data : DEFAULT_DEPARTMENTS,
        cities: cityRes.status === "fulfilled" ? cityRes.value.data : [],
        eps: epsRes.status === "fulfilled" ? epsRes.value.data : DEFAULT_EPS,
        arl: arlRes.status === "fulfilled" ? arlRes.value.data : DEFAULT_ARL,
        afp: afpRes.status === "fulfilled" ? afpRes.value.data : DEFAULT_AFP,
      });
    } catch {}
  }, []);

  useEffect(() => {
    loadEmployees();
    loadStats();
    loadRoles();
    loadCatalogs();
  }, [loadEmployees, loadStats, loadRoles, loadCatalogs]);

  const openCreate = () => {
    setEditMode(false);
    setEditId(null);
    setExistingAccess(false);
    setFormData({ ...emptyEmployee, company_id: companyId });
    setError("");
    setDialogOpen(true);
  };

  const openEdit = async (emp: any) => {
    setEditMode(true);
    setEditId(emp.id);
    setError("");
    try {
      const res = await api.get(`/employees/${emp.id}`);
      const d = res.data;
      setExistingAccess(d.has_access || false);
      setFormData({
        code: d.code || "",
        document_type: d.document_type || "CC",
        document_number: d.document_number || "",
        first_name: d.first_name || "",
        middle_name: d.middle_name || "",
        last_name: d.last_name || "",
        second_last_name: d.second_last_name || "",
        email: d.email || "",
        phone: d.phone || "",
        mobile: d.mobile || "",
        address: d.address || "",
        department_loc: d.department_loc || "Quindío",
        city: d.city || "Armenia",
        department_id: d.department_id || "",
        job_position_id: d.job_position_id || "",
        hire_date: d.hire_date || "",
        eps: d.eps || "EPS Sura",
        arl: d.arl || "Positiva Compañía de Seguros (ARL Positiva)",
        afp: d.afp || "Porvenir S.A.",
        status: d.status || "active",
        username: d.username || "",
        password: "",
        role_id: d.role_id || "",
        platform_access: d.platform_access || "both",
        photo_url: d.photo_url || "",
      });
    } catch {
      setFormData({ ...emptyEmployee, company_id: companyId });
    }
    setDialogOpen(true);
  };

  const openView = async (emp: any) => {
    try {
      const res = await api.get(`/employees/${emp.id}`);
      setViewData(res.data);
      setViewOpen(true);
    } catch {}
  };

  const handleSave = async () => {
    if (!formData.first_name || !formData.last_name || !formData.document_number || !formData.code) {
      setError("Primer nombre, primer apellido, número de documento y código son obligatorios");
      return;
    }

    setSaving(true);
    setError("");

    // Validate username uniqueness if specified
    if (formData.username && String(formData.username).trim().length >= 3) {
      const cleanUser = String(formData.username).trim();
      try {
        const excludeParam = editMode && editId ? `&exclude_id=${editId}` : "";
        const checkRes = await api.get(`/auth/check-username?username=${encodeURIComponent(cleanUser)}${excludeParam}`);
        if (checkRes.data.available === false) {
          setError(checkRes.data.message || `El usuario '${cleanUser}' ya está en uso. Por favor elija otro.`);
          setSaving(false);
          return;
        }
      } catch {}
    }

    // Clean role_id: ignore synthetic fallback role IDs
    const targetRoleId = formData.role_id && !formData.role_id.startsWith("fallback-") ? formData.role_id : null;

    try {
      if (editMode && editId) {
        const { username, password, role_id, platform_access, ...empData } = formData;
        await api.put(`/employees/${editId}`, empData);
        if (existingAccess) {
          if (username || password || targetRoleId || platform_access !== "both") {
            await api.put(`/employees/${editId}/access`, {
              ...(username ? { username } : {}),
              ...(password ? { password } : {}),
              role_id: targetRoleId,
              platform_access: platform_access || "both",
            });
          }
        } else if (username && password) {
          await api.post(`/employees/${editId}/access`, {
            username, password,
            role_id: targetRoleId,
            platform_access: platform_access || "both",
          });
        }
        showToast("success", "Empleado actualizado correctamente");
      } else {
        const { username, password, role_id, platform_access, ...empData } = formData;
        
        let currentCompany = companyId || empData.company_id || (typeof window !== "undefined" ? localStorage.getItem("company_id") : null);
        if (!currentCompany || currentCompany === "") {
          try {
            const meRes = await api.get("/auth/me");
            currentCompany = meRes.data?.company_id || "dla-company-main";
          } catch {
            currentCompany = "dla-company-main";
          }
        }
        empData.company_id = currentCompany || "dla-company-main";

        const res = await api.post(`/employees`, empData);
        const newId = res.data.id;

        if (newId && username && password) {
          try {
            await api.post(`/employees/${newId}/access`, {
              username, password,
              role_id: targetRoleId,
              platform_access: platform_access || "both",
            });
          } catch (accessErr: any) {
            showToast("error", `Empleado creado pero error al crear acceso: ${accessErr?.response?.data?.detail || "Error al crear usuario"}`);
          }
        }
        showToast("success", `Empleado "${formData.first_name} ${formData.last_name}" creado correctamente`);
        if (res.data && res.data.id) {
          setEmployees((prev) => [res.data, ...prev.filter((e) => e.id !== res.data.id)]);
          setTotal((prev) => prev + 1);
        }
      }
      setDialogOpen(false);
      await loadEmployees();
      await loadStats();
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      if (typeof detail === "string") {
        setError(detail);
      } else if (Array.isArray(detail)) {
        setError(detail.map((d: any) => d.msg || JSON.stringify(d)).join(", "));
      } else {
        setError("Error al guardar. Verifique los datos ingresados.");
      }
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/employees/${deleteId}`);
      setDeleteId(null);
      showToast("success", "Empleado eliminado correctamente");
      loadEmployees();
      loadStats();
    } catch (e: any) {
      showToast("error", e?.response?.data?.detail || "Error al eliminar empleado");
    }
  };

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
          <h1 className="text-2xl font-bold tracking-tight">Gestión de Empleados</h1>
          <p className="text-xs text-muted-foreground">Catálogo de personal, vinculaciones laborales y biometría ({total} registros)</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" onClick={handleDownloadEmployeesTemplate} className="gap-1.5 text-xs font-semibold">
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Plantilla Excel (.xlsx)
          </Button>
          <Button variant="outline" onClick={() => { setImportModalOpen(true); setImportRows([]); setImportResult(null); setImportFileName(""); }} className="gap-1.5 text-xs font-semibold">
            <Upload className="h-4 w-4 text-blue-600" /> Carga Masiva (Excel/CSV)
          </Button>
          <Button onClick={openCreate} className="gap-1 text-xs font-bold">
            <Plus className="h-4 w-4" /> Nuevo Empleado
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total", value: stats.total, color: "text-gray-900" },
          { label: "Activos", value: stats.active, color: "text-green-600" },
          { label: "Inactivos", value: stats.inactive, color: "text-yellow-600" },
          { label: "Retirados", value: stats.terminated, color: "text-red-600" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nombre, documento, código..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nombre completo</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Ubicación</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Cargando...</TableCell></TableRow>
              ) : employees.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No se encontraron empleados</TableCell></TableRow>
              ) : (
                employees.map((emp) => (
                  <TableRow key={emp.id}>
                    <TableCell className="font-mono text-sm">{emp.code}</TableCell>
                    <TableCell className="font-medium">{emp.first_name} {emp.last_name}</TableCell>
                    <TableCell>{emp.document_type} {emp.document_number}</TableCell>
                    <TableCell className="text-muted-foreground">{emp.email || "—"}</TableCell>
                    <TableCell className="text-xs">{emp.city || "Armenia"} ({emp.department_loc || "Quindío"})</TableCell>
                    <TableCell>
                      <Badge variant={emp.status === "active" ? "default" : emp.status === "terminated" ? "destructive" : "secondary"}>
                        {emp.status === "active" ? "Activo" : emp.status === "terminated" ? "Retirado" : emp.status === "inactive" ? "Inactivo" : emp.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {emp.username ? (
                        <Badge variant="default" className="text-[10px]">
                          {emp.username}
                          {emp.platform_access === "both" ? " (Web+App)" : emp.platform_access === "web" ? " (Web)" : emp.platform_access === "mobile" ? " (App)" : ""}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">Sin acceso</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="sm" onClick={() => openView(emp)}><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(emp)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteId(emp.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Diálogo Crear/Editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editMode ? "Editar Empleado" : "Nuevo Empleado"}</DialogTitle>
          </DialogHeader>
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}
          <EmployeeForm
            data={formData}
            onChange={setFormData}
            roles={roles}
            catalogs={catalogs}
            editing={editMode ? { ...formData, has_access: existingAccess } : null}
          />
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" size="sm">Cancelar</Button></DialogClose>
            <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? "Guardando..." : "Guardar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo Eliminar */}
      <Dialog open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Eliminar Empleado</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">¿Está seguro que desea eliminar este empleado? Esta acción no se puede deshacer.</p>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" size="sm">Cancelar</Button></DialogClose>
            <Button variant="destructive" size="sm" onClick={handleDelete}>Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo Ver Detalle */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Detalle del Empleado</DialogTitle></DialogHeader>
          {viewData && (
            <div className="space-y-4 text-sm">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-blue-900">
                  {viewData.first_name} {viewData.middle_name || ""} {viewData.last_name} {viewData.second_last_name || ""}
                </p>
                <p className="text-xs text-blue-600">{viewData.code}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">Estado:</span> <Badge variant={viewData.status === "active" ? "default" : "secondary"}>{viewData.status === "active" ? "Activo" : viewData.status}</Badge></div>
                <div><span className="text-muted-foreground">Documento:</span> {viewData.document_type} {viewData.document_number}</div>
                <div><span className="text-muted-foreground">Departamento:</span> {viewData.department_loc || "Quindío"}</div>
                <div><span className="text-muted-foreground">Ciudad:</span> {viewData.city || "Armenia"}</div>
                <div><span className="text-muted-foreground">Email:</span> {viewData.email || "—"}</div>
                <div><span className="text-muted-foreground">Celular:</span> {viewData.mobile || "—"}</div>
                <div><span className="text-muted-foreground">EPS:</span> {viewData.eps || "—"}</div>
                <div><span className="text-muted-foreground">ARL:</span> {viewData.arl || "—"}</div>
                <div><span className="text-muted-foreground">AFP:</span> {viewData.afp || "—"}</div>
                <div>
                  <span className="text-muted-foreground">Usuario:</span>{" "}
                  {viewData.has_access ? (
                    <Badge variant="default" className="text-xs">{viewData.username} ({viewData.platform_access === "both" ? "Web+App" : viewData.platform_access})</Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">Sin acceso</span>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" size="sm">Cerrar</Button></DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL DE CARGA MASIVA DE EMPLEADOS */}
      <Dialog open={importModalOpen} onOpenChange={setImportModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-emerald-600" /> Carga Masiva de Empleados en Excel / CSV
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="p-5 border-2 border-dashed rounded-xl bg-slate-50 text-center space-y-3">
              <FileSpreadsheet className="h-10 w-10 text-emerald-600 mx-auto" />
              <div>
                <p className="font-bold text-sm text-slate-800">Descarga la tabla de Excel oficial y complétala con tus empleados</p>
                <p className="text-[11px] text-slate-500 mt-0.5">El archivo viene estructurado en columnas con ejemplos listos para llenar y subir directamente.</p>
              </div>

              <div className="pt-1 flex justify-center gap-3 flex-wrap">
                <Button variant="outline" size="sm" onClick={handleDownloadEmployeesTemplate} className="gap-1.5 text-xs font-semibold border-emerald-300 text-emerald-700 hover:bg-emerald-50">
                  <Download className="h-4 w-4 text-emerald-600" /> Descargar Plantilla Excel (.xlsx)
                </Button>

                <label className="cursor-pointer">
                  <span className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs gap-1.5 shadow">
                    <Upload className="h-4 w-4" /> Seleccionar Archivo Excel o CSV
                  </span>
                  <input type="file" accept=".xlsx,.xls,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>

              {importFileName && (
                <div className="p-2 rounded-md bg-blue-50 border border-blue-200">
                  <p className="text-xs font-semibold text-blue-800">📊 Archivo cargado: <span className="font-mono">{importFileName}</span> ({importRows.length} registros listos)</p>
                </div>
              )}
            </div>

            {/* Preview Table */}
            {importRows.length > 0 && !importResult && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-slate-800">Vista Previa ({importRows.length} Registros)</p>
                  <span className="text-[11px] text-slate-500">Primeras filas a procesar</span>
                </div>
                <div className="max-h-56 overflow-y-auto border rounded-lg text-[11px]">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-100">
                        <TableHead>Documento</TableHead>
                        <TableHead>Nombre Completo</TableHead>
                        <TableHead>Cargo / Área</TableHead>
                        <TableHead>Ubicación</TableHead>
                        <TableHead>EPS / ARL</TableHead>
                        <TableHead>Usuario</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importRows.slice(0, 8).map((row, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-mono font-bold">{row.document_type || "CC"} {row.document_number || row.cedula}</TableCell>
                          <TableCell className="font-semibold">
                            {[row.first_name, row.middle_name, row.last_name, row.second_last_name].filter(Boolean).join(" ") || "—"}
                          </TableCell>
                          <TableCell>{row.job_position || "—"} / {row.department || "—"}</TableCell>
                          <TableCell>{row.city || "—"}, {row.department_loc || "—"}</TableCell>
                          <TableCell>{row.eps || "—"} / {row.arl || "—"}</TableCell>
                          <TableCell className="font-mono text-blue-600">{row.username || "—"}</TableCell>
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
                  <div className="p-2 bg-white rounded border"><p className="text-lg font-bold text-amber-600">{importResult.skipped_count}</p><p className="text-[10px] text-slate-500">Omitidos / Duplicados</p></div>
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
                {importing ? "Importando Registros..." : `Confirmar Importación (${importRows.length} Empleados)`}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
