import type { SessionState } from '../types/dictation';

/**
 * Persists the student's resume position (file name/size, page, line) in
 * IndexedDB rather than localStorage, per Section 20. The actual PDF bytes
 * are never stored or uploaded anywhere — only enough metadata to detect
 * "is this the same file the student re-opened" and restore their place.
 */

const DB_NAME = 'recorddictate';
const DB_VERSION = 1;
const STORE_NAME = 'session';
const SESSION_KEY = 'current';

function isIndexedDBAvailable(): boolean {
  return typeof window !== 'undefined' && 'indexedDB' in window;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!isIndexedDBAvailable()) {
      reject(new Error('IndexedDB is not available in this browser.'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveSession(state: SessionState): Promise<void> {
  if (!isIndexedDBAvailable()) return; // silently no-op; resume is a nicety, not core functionality
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(state, SESSION_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Persistence is best-effort; failures here must never break dictation.
  }
}

export async function loadSession(): Promise<SessionState | null> {
  if (!isIndexedDBAvailable()) return null;
  try {
    const db = await openDb();
    const result = await new Promise<SessionState | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(SESSION_KEY);
      req.onsuccess = () => resolve((req.result as SessionState) ?? null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return result;
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  if (!isIndexedDBAvailable()) return;
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(SESSION_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // no-op
  }
}

/** A saved session only makes sense to offer if it plausibly matches the newly-opened file. */
export function sessionMatchesFile(session: SessionState, file: File): boolean {
  return session.fileName === file.name && session.fileSize === file.size;
}
