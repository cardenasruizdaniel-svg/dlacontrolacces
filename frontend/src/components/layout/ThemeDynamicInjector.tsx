"use client";
import { useEffect } from "react";
import { useSystemConfig } from "@/lib/useSystemConfig";

// Función utilitaria para extraer el color dominante/promedio de una imagen base64
const extractAverageColor = (base64Url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject("No canvas context");
      
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      try {
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let r = 0, g = 0, b = 0, count = 0;
        
        // Muestrear píxeles (saltando de a 16 o más para rendimiento)
        for (let i = 0; i < data.length; i += 16) {
          if (data[i + 3] > 200) { // Solo píxeles mayormente opacos
            // Ignorar blanco puro y negro puro (fondos típicos de logos)
            if ((data[i] > 240 && data[i+1] > 240 && data[i+2] > 240) || (data[i] < 15 && data[i+1] < 15 && data[i+2] < 15)) continue;
            r += data[i];
            g += data[i + 1];
            b += data[i + 2];
            count++;
          }
        }
        
        if (count === 0) return resolve("200 98% 40%"); // Fallback DLA Cyan
        
        // Promedios
        r = Math.floor(r / count);
        g = Math.floor(g / count);
        b = Math.floor(b / count);
        
        // Convertir RGB a HSL
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h = 0, s = 0, l = (max + min) / 2;
        
        if (max !== min) {
          const d = max - min;
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
          switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
          }
          h /= 6;
        }
        
        // Mantener la saturación y luminosidad en rangos visibles y estéticos
        s = Math.max(0.4, Math.min(1, s)); 
        l = Math.max(0.3, Math.min(0.6, l)); // Ni muy claro ni muy oscuro
        
        // Retornar en formato HSL de Tailwind (ej: "200 98% 40%")
        const hslString = `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
        resolve(hslString);
      } catch (e) {
        resolve("200 98% 40%");
      }
    };
    img.onerror = () => resolve("200 98% 40%");
    img.src = base64Url;
  });
};

export default function ThemeDynamicInjector() {
  const { configs } = useSystemConfig();

  useEffect(() => {
    const setupTheme = async () => {
      // 1. DLA Default Colors (Fallback)
      let primaryHSL = "200 98% 40%"; // Cyan DLA
      
      const logoConfig = configs.find(c => c.key === "COMPANY_LOGO");
      const companyLogo = logoConfig?.value;
      
      if (companyLogo && companyLogo.startsWith("data:image")) {
        // Extraer color del logo configurado
        const extracted = await extractAverageColor(companyLogo);
        if (extracted) primaryHSL = extracted;
      }
      
      // Inyectar CSS global
      document.documentElement.style.setProperty("--primary", primaryHSL);
      // Para efectos de hover y brillos (ring), lo igualamos al primary
      document.documentElement.style.setProperty("--ring", primaryHSL);
    };

    if (configs && configs.length > 0) {
      setupTheme();
    }
  }, [configs]);

  return null; // Componente invisible, solo maneja lógica de efectos
}
