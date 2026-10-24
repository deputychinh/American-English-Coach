import { getCopy } from '@/locales';
import { isNativeShell } from '@/utils/api-base.util';

const CAMERA_MISSING_ERRORS = ['NotFoundError', 'OverconstrainedError'];

/** What to tell the learner when the camera does not open: raw browser text never reaches them. */
export const cameraMessage = (error: unknown): string => {
  // Safari's OverconstrainedError is not always an Error or a DOMException: the name decides.
  const name =
    typeof error === 'object' && error !== null && 'name' in error ? String(error.name) : '';
  if (name === 'NotAllowedError')
    return isNativeShell()
      ? getCopy().practice.cameraDeniedNative
      : getCopy().practice.cameraDenied;
  // "Invalid constraint" (no front camera, e.g. the iOS simulator) and "no device" read the same.
  if (CAMERA_MISSING_ERRORS.includes(name)) return getCopy().practice.cameraMissing;
  if (name === 'NotReadableError') return getCopy().practice.cameraBusy;
  return error instanceof Error && error.message ? error.message : getCopy().practice.noMedia;
};
