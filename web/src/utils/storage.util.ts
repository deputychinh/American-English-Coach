import type { StorageKey } from '@/enums/storage-key.enum';

/** localStorage can throw (private mode, blocked storage); every access is guarded. */
export const readStorage = <T>(key: StorageKey, fallback: T): T => {
  try {
    const raw = globalThis.localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
};

export const writeStorage = (key: StorageKey, value: unknown): void => {
  try {
    globalThis.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage is a convenience only; the app keeps working without it.
  }
};

export const removeStorage = (key: StorageKey): void => {
  try {
    globalThis.localStorage.removeItem(key);
  } catch {
    // ignore
  }
};
