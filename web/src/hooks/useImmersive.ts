'use client';

import { useEffect, useSyncExternalStore } from 'react';

// Screens built around the live camera (mirror, calibration) ask the shell to step back on
// phones: no brand header or footer, content edge to edge. Counted so nested users compose.
let activeCount = 0;
const listeners = new Set<() => void>();
const notify = (): void => listeners.forEach((listener) => listener());

const subscribeImmersive = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const readImmersive = (): boolean => activeCount > 0;

/** Marks the current screen as immersive for as long as it is mounted. */
export const useImmersive = (): void => {
  useEffect(() => {
    activeCount += 1;
    notify();
    return () => {
      activeCount -= 1;
      notify();
    };
  }, []);
};

/** Whether any mounted screen asked for the immersive shell (false during SSR). */
export const useIsImmersive = (): boolean =>
  useSyncExternalStore(subscribeImmersive, readImmersive, () => false);
