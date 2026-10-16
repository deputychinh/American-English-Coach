'use client';

import { useEffect } from 'react';

import { env } from '@/config/env';

/** Registers /sw.js in production builds only (dev keeps live reload simple). */
export const RegisterServiceWorker = (): null => {
  useEffect(() => {
    if (!env.isProduction || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  }, []);
  return null;
};
