'use client';

import { useEffect } from 'react';

import { env } from '@/config/env';

/** Registers /sw.js in production builds only (dev keeps live reload simple). */
export const RegisterServiceWorker = (): null => {
  useEffect(() => {
    // Not inside the native shell (capacitor://), where the app files are bundled already.
    if (!env.isProduction || !('serviceWorker' in navigator)) return;
    if (!window.location.protocol.startsWith('http')) return;
    navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  }, []);
  return null;
};
