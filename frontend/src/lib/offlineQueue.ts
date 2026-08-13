import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface SyncDBSchema extends DBSchema {
  offline_mutations: {
    key: string;
    value: {
      id: string;
      method: string;
      url: string;
      data: any;
      headers: any;
      timestamp: number;
      retryCount: number;
    };
    indexes: { 'by-timestamp': number };
  };
}

const DB_NAME = 'DLA_SyncDB';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<SyncDBSchema>> | null = null;

function getDB() {
  if (typeof window === 'undefined') return null;
  if (!dbPromise) {
    dbPromise = openDB<SyncDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('offline_mutations')) {
          const store = db.createObjectStore('offline_mutations', { keyPath: 'id' });
          store.createIndex('by-timestamp', 'timestamp');
        }
      },
    });
  }
  return dbPromise;
}

export async function addOfflineMutation(method: string, url: string, data: any, headers: any): Promise<string> {
  const db = await getDB();
  if (!db) return '';

  // Deduplication check: Do not store duplicate mutations for identical URL & payload
  try {
    const existing = await db.getAll('offline_mutations');
    const dataStr = JSON.stringify(data || {});
    const duplicate = existing.find((m) => m.method === method && m.url === url && JSON.stringify(m.data || {}) === dataStr);
    if (duplicate) {
      console.log(`[OfflineQueue] Mutación duplicada omitida (${method} ${url})`);
      return duplicate.id;
    }
  } catch (e) {
    console.warn("Error al verificar duplicados en offlineQueue:", e);
  }

  const id = `mut_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  await db.add('offline_mutations', {
    id,
    method,
    url,
    data,
    headers,
    timestamp: Date.now(),
    retryCount: 0,
  });
  return id;
}

export async function getOfflineMutations() {
  const db = await getDB();
  if (!db) return [];
  return db.getAllFromIndex('offline_mutations', 'by-timestamp');
}

export async function removeOfflineMutation(id: string) {
  const db = await getDB();
  if (!db) return;
  await db.delete('offline_mutations', id);
}

export async function incrementRetryCount(id: string) {
  const db = await getDB();
  if (!db) return;
  const tx = db.transaction('offline_mutations', 'readwrite');
  const store = tx.objectStore('offline_mutations');
  const record = await store.get(id);
  if (record) {
    record.retryCount += 1;
    await store.put(record);
  }
  await tx.done;
}
