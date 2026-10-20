import { registerPlugin } from '@capacitor/core';

import { env } from '@/config/env';
import { ENGINE_MODEL_NAME } from '@/constants/engine.constant';
import type { EngineModelFile, PhonemeEnginePlugin } from '@/interfaces/engine.interface';
import { deviceHeaders, isNativeShell, resolveApiBaseUrl } from '@/utils/api-base.util';

/** Native on-device phoneme model; only the iOS shell implements it. */
export const PhonemeEngine = registerPlugin<PhonemeEnginePlugin>('PhonemeEngine');

export const isEngineAvailable = (): boolean => isNativeShell();

/**
 * Where to download the model from. Preview: the paired scoring server (`/api/v1/models`), with
 * the pairing token. The App Store build will use a CDN with the same manifest.
 */
export const modelSource = async (): Promise<{
  url: string;
  file: EngineModelFile;
  headers: Record<string, string>;
} | null> => {
  const base = resolveApiBaseUrl(env.apiBaseUrl);
  const response = await fetch(`${base}/api/v1/models/manifest`, { headers: deviceHeaders() });
  if (!response.ok) return null;
  const manifest = (await response.json()) as { files?: Record<string, EngineModelFile> };
  const file = manifest.files?.[ENGINE_MODEL_NAME];
  if (!file) return null;
  return { url: `${base}/api/v1/models/${ENGINE_MODEL_NAME}`, file, headers: deviceHeaders() };
};
