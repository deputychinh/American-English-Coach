import { api } from '@/api/client';
import { StorageKey } from '@/enums/storage-key.enum';
import type { PairedDevice } from '@/interfaces/practice.interface';
import { problemMessage } from '@/utils/problem.util';
import { readStorage, removeStorage, writeStorage } from '@/utils/storage.util';

const FALLBACK = 'Không ghép nối được';

/** Exchange the 6-digit code shown by `make api-lan` for a device token, stored on this device. */
export const pairDevice = async (code: string, deviceName: string): Promise<PairedDevice> => {
  const { data, error } = await api.POST('/api/v1/pair', {
    body: { code, device_name: deviceName },
  });
  if (!data) throw new Error(problemMessage(error, FALLBACK));
  writeStorage(StorageKey.DeviceToken, data.token);
  writeStorage(StorageKey.DeviceName, data.device_name);
  return { token: data.token, deviceName: data.device_name };
};

export const pairedDevice = (): PairedDevice | null => {
  const token = readStorage<string>(StorageKey.DeviceToken, '');
  if (!token) return null;
  return { token, deviceName: readStorage<string>(StorageKey.DeviceName, '') };
};

export const unpairDevice = (): void => {
  removeStorage(StorageKey.DeviceToken);
  removeStorage(StorageKey.DeviceName);
};

/** Default device label from the platform string (e.g. "iPhone", "MacIntel"). */
export const guessDeviceName = (fallback: string): string => {
  if (typeof navigator === 'undefined') return fallback;
  const platform = navigator.platform || '';
  if (/iphone|ipad|ipod/i.test(platform) || /iphone|ipad/i.test(navigator.userAgent))
    return 'iPhone';
  if (/mac/i.test(platform)) return 'Mac';
  if (/android/i.test(navigator.userAgent)) return 'Android';
  return fallback;
};
