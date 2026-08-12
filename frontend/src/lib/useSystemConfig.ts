import { useState, useEffect } from "react";
import api from "@/lib/api";

export interface ConfigItem {
  key: string;
  value: string | null;
  description: string | null;
}

// Helper: parse cached configs from localStorage
function getCachedConfigs(): ConfigItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("system_configs");
    if (raw) return JSON.parse(raw) as ConfigItem[];
  } catch {}
  return [];
}

export const useSystemConfig = () => {
  // Initialize immediately from cache so Sidebar renders correctly on first frame
  const [configs, setConfigs] = useState<ConfigItem[]>(() => getCachedConfigs());
  const [loading, setLoading] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const loadConfigs = async () => {
    setLoading(true);
    try {
      const res = await api.get("/system-config/");
      const fresh = res.data || [];
      setConfigs(fresh);
      // Update cache for next load
      if (typeof window !== "undefined") {
        localStorage.setItem("system_configs", JSON.stringify(fresh));
      }
    } catch (e) {
      console.error("Error loading system config:", e);
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = async (key: string, value: string, description?: string) => {
    setSavingKey(key);
    try {
      const res = await api.put(`/system-config/${key}`, { key, value, description });
      setConfigs((prev) => {
        const exists = prev.some((c) => c.key === key);
        const newConfigs = exists 
          ? prev.map((c) => (c.key === key ? { ...c, value: res.data.value } : c))
          : [...prev, { key, value: res.data.value, description: res.data.description }];
        
        if (typeof window !== "undefined") {
          localStorage.setItem("system_configs", JSON.stringify(newConfigs));
        }
        return newConfigs;
      });
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.response?.data?.detail || "Error al guardar" };
    } finally {
      setSavingKey(null);
    }
  };

  useEffect(() => {
    loadConfigs();
  }, []);

  return { configs, loading, savingKey, updateConfig, reload: loadConfigs };
};

