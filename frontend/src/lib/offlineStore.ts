export interface OfflinePunch {
  id: string;
  type: "start" | "end" | "entry" | "exit" | "meal_start" | "meal_end" | "break_start" | "break_end" | string;
  shift_id?: string | null;
  latitude: number;
  longitude: number;
  photo_base64?: string | null;
  observations?: string | null;
  offline_timestamp: string;
  is_mock_location?: boolean;
  device_id?: string;
  created_at: string;
  status: "pending" | "synced" | "failed";
  retry_count: number;
  last_error?: string;
}

const DB_NAME = "DLA_Access_OfflineDB";
const DB_VERSION = 1;
const PUNCHES_STORE = "pending_punches";
const AGENDA_STORE = "cached_agenda";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB no está disponible en este navegador."));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(PUNCHES_STORE)) {
        db.createObjectStore(PUNCHES_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(AGENDA_STORE)) {
        db.createObjectStore(AGENDA_STORE, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ── PENDING PUNCHES ─────────────────────────────────────────────────────────

export async function saveOfflinePunch(punch: Omit<OfflinePunch, "id" | "created_at" | "status" | "retry_count">): Promise<OfflinePunch> {
  const db = await openDB();
  const record: OfflinePunch = {
    ...punch,
    id: `punch_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    created_at: new Date().toISOString(),
    status: "pending",
    retry_count: 0,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(PUNCHES_STORE, "readwrite");
    const store = tx.objectStore(PUNCHES_STORE);
    const req = store.put(record);

    req.onsuccess = () => resolve(record);
    req.onerror = () => reject(req.error);
  });
}

export async function getPendingPunches(): Promise<OfflinePunch[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(PUNCHES_STORE, "readonly");
      const store = tx.objectStore(PUNCHES_STORE);
      const req = store.getAll();

      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("Error leyendo marcaciones offline:", err);
    return [];
  }
}

export async function removeOfflinePunch(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PUNCHES_STORE, "readwrite");
    const store = tx.objectStore(PUNCHES_STORE);
    const req = store.delete(id);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ── CACHED AGENDA ───────────────────────────────────────────────────────────

export async function saveCachedAgenda(shifts: any[]): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(AGENDA_STORE, "readwrite");
    const store = tx.objectStore(AGENDA_STORE);
    store.put({ id: "current_agenda", shifts, updated_at: new Date().toISOString() });
  } catch (err) {
    console.warn("Error guardando agenda en caché local:", err);
  }
}

export async function getCachedAgenda(): Promise<any[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(AGENDA_STORE, "readonly");
      const store = tx.objectStore(AGENDA_STORE);
      const req = store.get("current_agenda");

      req.onsuccess = () => resolve(req.result?.shifts || []);
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

// ── SYNCHRONIZATION ENGINE ──────────────────────────────────────────────────

export async function syncOfflinePunches(apiInstance: any): Promise<{ total: number; synced: number; failed: number }> {
  const pending = await getPendingPunches();
  if (pending.length === 0) {
    return { total: 0, synced: 0, failed: 0 };
  }

  let synced = 0;
  let failed = 0;

  for (const punch of pending) {
    try {
      if (punch.type === "start") {
        await apiInstance.post("/mobile/me/start-visit", {
          shift_id: punch.shift_id,
          latitude: punch.latitude,
          longitude: punch.longitude,
          photo_base64: punch.photo_base64,
          device_id: punch.device_id || "PWA-Web-Device",
          offline_timestamp: punch.offline_timestamp,
          is_mock_location: punch.is_mock_location || false,
        });
      } else {
        await apiInstance.post("/mobile/me/end-visit", {
          shift_id: punch.shift_id,
          latitude: punch.latitude,
          longitude: punch.longitude,
          photo_base64: punch.photo_base64,
          observations: punch.observations,
          device_id: punch.device_id || "PWA-Web-Device",
          offline_timestamp: punch.offline_timestamp,
        });
      }

      await removeOfflinePunch(punch.id);
      synced++;
    } catch (error: any) {
      console.error(`Falló sincronización para marcación ${punch.id}:`, error);
      failed++;
    }
  }

  return { total: pending.length, synced, failed };
}
