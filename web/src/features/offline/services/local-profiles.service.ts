import { DEFAULT_PROFILE_ID } from '@/constants/api.constant';
import { StorageKey } from '@/enums/storage-key.enum';
import type { LocalProfile } from '@/interfaces/local-store.interface';
import { readStorage, writeStorage } from '@/utils/storage.util';

/** Learner profiles on the device; the default profile always exists and cannot be deleted. */

const DEFAULT_NAME = 'Người học';

export const listLocalProfiles = (): LocalProfile[] => {
  const stored = readStorage<LocalProfile[]>(StorageKey.LocalProfiles, []);
  if (stored.some((profile) => profile.id === DEFAULT_PROFILE_ID)) return stored;
  const withDefault = [
    { id: DEFAULT_PROFILE_ID, name: DEFAULT_NAME, createdAt: new Date(0).toISOString() },
    ...stored,
  ];
  writeStorage(StorageKey.LocalProfiles, withDefault);
  return withDefault;
};

const save = (profiles: LocalProfile[]): void => writeStorage(StorageKey.LocalProfiles, profiles);

export const createLocalProfile = (name: string): LocalProfile => {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  const profile = {
    id: [...bytes].map((b) => b.toString(16).padStart(2, '0')).join(''),
    name: name.trim().slice(0, 80),
    createdAt: new Date().toISOString(),
  };
  save([...listLocalProfiles(), profile]);
  return profile;
};

export const renameLocalProfile = (id: string, name: string): LocalProfile | null => {
  const profiles = listLocalProfiles();
  const found = profiles.find((profile) => profile.id === id);
  if (!found) return null;
  const renamed = { ...found, name: name.trim().slice(0, 80) };
  save(profiles.map((profile) => (profile.id === id ? renamed : profile)));
  return renamed;
};

export const deleteLocalProfile = (id: string): boolean => {
  if (id === DEFAULT_PROFILE_ID) return false;
  save(listLocalProfiles().filter((profile) => profile.id !== id));
  return true;
};
