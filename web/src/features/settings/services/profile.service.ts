import { api } from '@/api/client';
import { DEFAULT_PROFILE_ID, PROFILE_CHANGED_EVENT } from '@/constants/api.constant';
import { StorageKey } from '@/enums/storage-key.enum';
import type {
  ActiveProfile,
  ImportResult,
  Profile,
  ProfileExport,
} from '@/interfaces/practice.interface';
import { getCopy } from '@/locales';
import { problemMessage } from '@/utils/problem.util';
import { readStorage, removeStorage, writeStorage } from '@/utils/storage.util';

const copy = getCopy().settings.profiles;

export const listProfiles = async (): Promise<Profile[]> => {
  const { data, error } = await api.GET('/api/v1/profiles');
  if (!data) throw new Error(problemMessage(error, copy.loadFailed));
  return data;
};

export const createProfile = async (name: string): Promise<Profile> => {
  const { data, error } = await api.POST('/api/v1/profiles', { body: { name } });
  if (!data) throw new Error(problemMessage(error, copy.loadFailed));
  return data;
};

export const renameProfile = async (id: string, name: string): Promise<Profile> => {
  const { data, error } = await api.PATCH('/api/v1/profiles/{profile_id}', {
    params: { path: { profile_id: id } },
    body: { name },
  });
  if (!data) throw new Error(problemMessage(error, copy.loadFailed));
  return data;
};

export const deleteProfile = async (id: string): Promise<void> => {
  const { error, response } = await api.DELETE('/api/v1/profiles/{profile_id}', {
    params: { path: { profile_id: id } },
  });
  if (!response.ok) throw new Error(problemMessage(error, copy.loadFailed));
};

export const exportProfile = async (id: string): Promise<ProfileExport> => {
  const { data, error } = await api.GET('/api/v1/profiles/{profile_id}/export', {
    params: { path: { profile_id: id } },
  });
  if (!data) throw new Error(problemMessage(error, copy.loadFailed));
  return data;
};

export const importProfile = async (snapshot: ProfileExport): Promise<ImportResult> => {
  const { data, error } = await api.POST('/api/v1/profiles/import', { body: snapshot });
  if (!data) throw new Error(problemMessage(error, copy.importFailed));
  return data;
};

/** The profile this device works in; 'default' with its display name until one is chosen. */
export const activeProfile = (): ActiveProfile => ({
  id: readStorage<string>(StorageKey.ProfileId, '') || DEFAULT_PROFILE_ID,
  name: readStorage<string>(StorageKey.ProfileName, '') || copy.defaultName,
});

/**
 * Switch this device to a profile. The browser copy of the mouth calibration belongs to the old
 * profile, so it is dropped; the next mirror/practice visit loads the new profile's from the API.
 */
export const setActiveProfile = (profile: ActiveProfile): void => {
  writeStorage(StorageKey.ProfileId, profile.id);
  writeStorage(StorageKey.ProfileName, profile.name);
  removeStorage(StorageKey.Calibration);
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(PROFILE_CHANGED_EVENT));
};

/** Keep the stored name in step after a rename, without touching calibration. */
export const noteProfileRenamed = (profile: ActiveProfile): void => {
  if (activeProfile().id !== profile.id) return;
  writeStorage(StorageKey.ProfileName, profile.name);
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(PROFILE_CHANGED_EVENT));
};
