'use client';

import { useEffect } from 'react';

import { nativeKeepAwake } from '@/utils/native.util';

/** Keeps the phone screen on while a practice or mirror screen is mounted (native shell only). */
export const useKeepAwake = (enabled = true): void => {
  useEffect(() => {
    if (!enabled) return;
    void nativeKeepAwake(true);
    return () => {
      void nativeKeepAwake(false);
    };
  }, [enabled]);
};
