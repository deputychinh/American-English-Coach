import { api } from '@/api/client';
import { StorageKey } from '@/enums/storage-key.enum';
import type { Calibration } from '@/interfaces/mouth.interface';
import { calibrationFromPayload, calibrationToPayload } from '@/utils/calibration.util';
import { readStorage, removeStorage, writeStorage } from '@/utils/storage.util';

/** Browser copy first (works offline), then the API copy. */
export const loadCalibration = async (): Promise<Calibration | null> => {
  const local = calibrationFromPayload(readStorage(StorageKey.Calibration, null));
  if (local) return local;
  try {
    const { data } = await api.GET('/api/v1/calibration');
    const remote = calibrationFromPayload(data?.features);
    if (remote) writeStorage(StorageKey.Calibration, calibrationToPayload(remote));
    return remote;
  } catch {
    return null;
  }
};

/** Saves locally always; the API save may fail without losing the calibration. */
export const saveCalibration = async (calibration: Calibration): Promise<boolean> => {
  const payload = calibrationToPayload(calibration);
  writeStorage(StorageKey.Calibration, payload);
  try {
    const { response } = await api.PUT('/api/v1/calibration', { body: { features: payload } });
    return response.ok;
  } catch {
    return false;
  }
};

export const clearCalibration = (): void => removeStorage(StorageKey.Calibration);
