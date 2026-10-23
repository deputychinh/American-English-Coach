import { StorageKey } from '@/enums/storage-key.enum';
import { clearCalibration } from '@/features/mirror/services/calibration.service';
import { getCopy } from '@/locales';
import { reviewStore, runsStore } from '@/utils/local-store.util';
import { nativeScheduleDailyReminder } from '@/utils/native.util';
import { removeStorage } from '@/utils/storage.util';

/** The learner's data on this device; theme, language and the scoring pack stay. */
const LEARNER_KEYS: StorageKey[] = [
  StorageKey.CameraDefault,
  StorageKey.Muted,
  StorageKey.ApiBaseUrl,
  StorageKey.DeviceToken,
  StorageKey.DeviceName,
  StorageKey.DailyGoal,
  StorageKey.ReminderTime,
  StorageKey.LocalProfiles,
  StorageKey.ProfileId,
  StorageKey.ProfileName,
  StorageKey.Listening,
  StorageKey.Placement,
  StorageKey.Lesson,
];

/**
 * Settings → "clear the data on this device": scored runs, review cards, profiles, lesson places, listening
 * and placement results, calibration, the reminder and the server pairing. A classroom server
 * keeps its own copy (the privacy page says so).
 */
export const clearDeviceData = async (): Promise<void> => {
  clearCalibration();
  LEARNER_KEYS.forEach((key) => removeStorage(key));
  const copy = getCopy().settings;
  await Promise.all([
    runsStore().clear(),
    reviewStore().clear(),
    nativeScheduleDailyReminder(
      null,
      copy.reminderNotificationTitle,
      copy.reminderNotificationBody,
    ),
  ]);
};
