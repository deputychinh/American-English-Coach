'use client';

import { useCallback, useMemo, useSyncExternalStore } from 'react';

import type { StorageKey } from '@/enums/storage-key.enum';
import { writeStorage } from '@/utils/storage.util';

const listeners = new Set<() => void>();
const notify = (): void => listeners.forEach((listener) => listener());

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  globalThis.addEventListener('storage', listener);
  return () => {
    listeners.delete(listener);
    globalThis.removeEventListener('storage', listener);
  };
};

const readRaw = (key: StorageKey): string | null => {
  try {
    return globalThis.localStorage.getItem(key);
  } catch {
    return null;
  }
};

/** useState backed by localStorage (primitives); static HTML hydrates with the fallback. */
export const useStoredState = <T extends string | number | boolean>(
  key: StorageKey,
  fallback: T,
): [T, (value: T) => void] => {
  const raw = useSyncExternalStore(
    subscribe,
    () => readRaw(key),
    () => null,
  );
  const value = useMemo((): T => {
    if (raw === null) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }, [raw, fallback]);

  const update = useCallback(
    (next: T) => {
      writeStorage(key, next);
      notify();
    },
    [key],
  );
  return [value, update];
};
