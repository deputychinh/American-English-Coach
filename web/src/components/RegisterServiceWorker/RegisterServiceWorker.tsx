'use client';

import { useEffect } from 'react';

import { env } from '@/config/env';
import { listenForInstallPrompt } from '@/features/install/services/install-prompt.service';

/**
 * Registers /sw.js in production builds only (dev keeps live reload simple), and catches the
 * browser's install prompt as early as possible for the home screen card.
 */
export const RegisterServiceWorker = (): null => {
  useEffect(() => {
    listenForInstallPrompt();
    // Not inside the native shell (capacitor://), where the app files are bundled already.
    if (!env.isProduction || !('serviceWorker' in navigator)) return;
    if (!window.location.protocol.startsWith('http')) return;
    navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  }, []);
  return null;
};
