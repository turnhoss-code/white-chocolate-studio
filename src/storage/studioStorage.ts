/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * White Chocolate Studio - Persistent Session & Audio File Store (IndexedDB)
 */

export interface RecordedVoiceClip {
  id: string;
  name: string;
  blob: Blob;
  duration: number; // in seconds
  createdAt: number;
  color: string;
  assignedPad?: string; // e.g. 'mixer_pad_1' or 'soundboard_custom'
}

export interface SessionState {
  version: number;
  lastUpdated: number;
  pastelTheme: 'dark' | 'mint' | 'peach' | 'lavender' | 'blue';
  crossfader: number;
  crossfaderCurve: 'smooth' | 'cut' | 'linear';
  deckA: {
    trackId: string | null;
    volume: number;
    eqHigh: number;
    eqMid: number;
    eqLow: number;
    filter: number;
  };
  deckB: {
    trackId: string | null;
    volume: number;
    eqHigh: number;
    eqMid: number;
    eqLow: number;
    filter: number;
  };
  mixerQuickFX: {
    slot1: string; // sound ID or clip ID
    slot2: string;
    slot3: string;
    slot4: string;
    slot5: string;
    slot6: string;
  };
}

const DB_NAME = 'WhiteChocolateStudioDB';
const DB_VERSION = 1;
const SESSION_STORE = 'session';
const FILES_STORE = 'audioFiles';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(SESSION_STORE)) {
        db.createObjectStore(SESSION_STORE, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(FILES_STORE)) {
        db.createObjectStore(FILES_STORE, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export const studioStorage = {
  // Session State Persistence
  async saveSession(state: Partial<SessionState>): Promise<void> {
    try {
      const db = await openDB();
      const tx = db.transaction(SESSION_STORE, 'readwrite');
      const store = tx.objectStore(SESSION_STORE);
      const existing = (await this.loadSession()) || {};
      const merged = {
        key: 'current_session',
        data: {
          ...existing,
          ...state,
          lastUpdated: Date.now(),
        },
      };
      store.put(merged);
      return new Promise((res, rej) => {
        tx.oncomplete = () => res();
        tx.onerror = () => rej(tx.error);
      });
    } catch (err) {
      console.warn('Failed to save session to IndexedDB:', err);
    }
  },

  async loadSession(): Promise<SessionState | null> {
    try {
      const db = await openDB();
      return new Promise((resolve) => {
        const tx = db.transaction(SESSION_STORE, 'readonly');
        const store = tx.objectStore(SESSION_STORE);
        const req = store.get('current_session');
        req.onsuccess = () => {
          if (req.result && req.result.data) {
            resolve(req.result.data as SessionState);
          } else {
            resolve(null);
          }
        };
        req.onerror = () => resolve(null);
      });
    } catch (err) {
      console.warn('Failed to load session from IndexedDB:', err);
      return null;
    }
  },

  // File Store for Recorded Voice Audio Clips
  async saveAudioClip(clip: RecordedVoiceClip): Promise<void> {
    try {
      const db = await openDB();
      const tx = db.transaction(FILES_STORE, 'readwrite');
      const store = tx.objectStore(FILES_STORE);
      store.put(clip);
      return new Promise((res, rej) => {
        tx.oncomplete = () => res();
        tx.onerror = () => rej(tx.error);
      });
    } catch (err) {
      console.warn('Failed to save audio clip to File Store:', err);
    }
  },

  async getAllAudioClips(): Promise<RecordedVoiceClip[]> {
    try {
      const db = await openDB();
      return new Promise((resolve) => {
        const tx = db.transaction(FILES_STORE, 'readonly');
        const store = tx.objectStore(FILES_STORE);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });
    } catch (err) {
      console.warn('Failed to load audio clips from File Store:', err);
      return [];
    }
  },

  async deleteAudioClip(id: string): Promise<void> {
    try {
      const db = await openDB();
      const tx = db.transaction(FILES_STORE, 'readwrite');
      const store = tx.objectStore(FILES_STORE);
      store.delete(id);
      return new Promise((res, rej) => {
        tx.oncomplete = () => res();
        tx.onerror = () => rej(tx.error);
      });
    } catch (err) {
      console.warn('Failed to delete audio clip:', err);
    }
  },
};
