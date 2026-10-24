import { registerPlugin } from '@capacitor/core';

import { env } from '@/config/env';
import { ENGINE_MODEL_VERSION, WEB_ENGINE_MODEL_VERSION } from '@/constants/engine.constant';
import type { PhonemeEnginePlugin } from '@/interfaces/engine.interface';
import { isNativeShell } from '@/utils/api-base.util';

/**
 * On-device phoneme model: the iOS plugin in the app, ONNX Runtime Web in the web app. The web
 * implementation (and its 11 MB runtime) loads only when a browser first calls the engine.
 */
export const PhonemeEngine = registerPlugin<PhonemeEnginePlugin>('PhonemeEngine', {
  web: () =>
    import('@/features/engine/services/web-engine.service').then(
      (module) => module.webPhonemeEngine,
    ),
});

/** The browser can hold and run the model: workers, WebAssembly and Cache Storage (HTTPS). */
const canRunInBrowser = (): boolean =>
  typeof window !== 'undefined' &&
  typeof WebAssembly === 'object' &&
  typeof Worker !== 'undefined' &&
  typeof caches !== 'undefined';

export const isEngineAvailable = (): boolean =>
  isNativeShell() || (env.isStandaloneWeb && canRunInBrowser());

/** The iOS plugin (Neural Engine available) rather than the browser runtime (CPU only). */
export const isNativeEngine = (): boolean => isNativeShell();

/** Stored with each result so scores from different runtimes are never mixed. */
export const engineModelVersion = (): string =>
  isNativeEngine() ? ENGINE_MODEL_VERSION : WEB_ENGINE_MODEL_VERSION;
