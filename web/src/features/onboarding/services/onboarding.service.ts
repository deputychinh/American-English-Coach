import { StorageKey } from '@/enums/storage-key.enum';
import type { MediaPermissions } from '@/interfaces/onboarding.interface';
import { readStorage, writeStorage } from '@/utils/storage.util';

export const isOnboarded = (): boolean => readStorage<boolean>(StorageKey.Onboarded, false);

export const markOnboarded = (): void => writeStorage(StorageKey.Onboarded, true);

const probe = async (
  constraints: MediaStreamConstraints,
): Promise<'granted' | 'denied' | 'missing'> => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    stream.getTracks().forEach((track) => track.stop());
    return 'granted';
  } catch (error) {
    if (error instanceof DOMException && error.name === 'NotFoundError') return 'missing';
    return 'denied';
  }
};

/** Ask for the microphone and the camera once, separately, so one refusal does not block the other. */
export const requestMediaPermissions = async (): Promise<MediaPermissions> => {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
    return { microphone: 'missing', camera: 'missing' };
  }
  const microphone = await probe({ audio: true });
  const camera = await probe({ video: { facingMode: 'user' } });
  return { microphone, camera };
};
