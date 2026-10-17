'use client';

import { useMemo, useSyncExternalStore } from 'react';

import { DEFAULT_PROFILE_ID, PROFILE_CHANGED_EVENT } from '@/constants/api.constant';
import { StorageKey } from '@/enums/storage-key.enum';
import type { ActiveProfile } from '@/interfaces/practice.interface';
import { getCopy } from '@/locales';
import { readStorage } from '@/utils/storage.util';

const subscribe = (listener: () => void): (() => void) => {
  window.addEventListener(PROFILE_CHANGED_EVENT, listener);
  window.addEventListener('storage', listener);
  return () => {
    window.removeEventListener(PROFILE_CHANGED_EVENT, listener);
    window.removeEventListener('storage', listener);
  };
};

const snapshot = (): string =>
  `${readStorage<string>(StorageKey.ProfileId, '')}\n${readStorage<string>(StorageKey.ProfileName, '')}`;

/** The learner profile this device works in; re-renders when Settings switches it. */
export const useActiveProfile = (): ActiveProfile => {
  const raw = useSyncExternalStore(subscribe, snapshot, () => '\n');
  return useMemo(() => {
    const [id, name] = raw.split('\n');
    return {
      id: id || DEFAULT_PROFILE_ID,
      name: name || getCopy().settings.profiles.defaultName,
    };
  }, [raw]);
};
