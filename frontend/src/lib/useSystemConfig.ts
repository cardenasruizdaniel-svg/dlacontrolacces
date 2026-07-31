import { useState, useEffect } from "react";
import api from "@/lib/api";

export interface ConfigItem {
  key: string;
  value: string | null;
  description: string | null;
}

export const useSystemConfig = () => {
  const [configs, setConfigs] = useState<ConfigItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const loadConfigs = async () => {
    setLoading(true);
    try {
      const res = await api.get("/system-config/");
      setConfigs(res.data || []);
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
      setConfigs((prev) =>
        prev.map((c) => (c.key === key ? { ...c, value: res.data.value } : c))
      );
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
