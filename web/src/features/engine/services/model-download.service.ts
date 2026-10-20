import {
  ENGINE_MODEL_NAME,
  ENGINE_MODEL_SHA256,
  ENGINE_MODEL_URL,
} from '@/constants/engine.constant';
import { StorageKey } from '@/enums/storage-key.enum';
import { isEngineAvailable, PhonemeEngine } from '@/features/engine/services/engine.service';
import type { ModelDownloadState } from '@/interfaces/model-download.interface';
import { writeStorage } from '@/utils/storage.util';

/**
 * The one-time model download (plan A4) as a small store: the download runs natively and keeps
 * going while the learner moves between screens, and every card shows the same progress.
 */

let state: ModelDownloadState = { phase: 'unknown', percent: 0, error: null };
const listeners = new Set<() => void>();

const set = (next: Partial<ModelDownloadState>): void => {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
};

export const subscribeModelDownload = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const modelDownloadState = (): ModelDownloadState => state;

const markReady = (isReady: boolean): void => {
  // Local mode (api-base.util isLocalMode) turns on once the model is on the device.
  writeStorage(StorageKey.EngineReady, isReady);
};

/** Ask the device whether the model is there (cheap; safe to call on every screen mount). */
export const refreshModelDownload = async (): Promise<void> => {
  if (!isEngineAvailable() || state.phase === 'downloading') return;
  try {
    const status = await PhonemeEngine.status({ name: ENGINE_MODEL_NAME });
    markReady(status.downloaded);
    set({ phase: status.downloaded ? 'ready' : 'missing', error: null });
  } catch (cause) {
    set({ phase: 'error', error: cause instanceof Error ? cause.message : String(cause) });
  }
};

export const startModelDownload = async (): Promise<void> => {
  if (state.phase === 'downloading') return;
  set({ phase: 'downloading', percent: 0, error: null });
  const listener = await PhonemeEngine.addListener('downloadProgress', ({ received, expected }) =>
    set({ percent: expected > 0 ? Math.min(100, Math.round((100 * received) / expected)) : 0 }),
  );
  try {
    await PhonemeEngine.download({
      url: ENGINE_MODEL_URL,
      name: ENGINE_MODEL_NAME,
      sha256: ENGINE_MODEL_SHA256,
      headers: {},
    });
    markReady(true);
    set({ phase: 'ready', percent: 100 });
  } catch (cause) {
    markReady(false);
    set({ phase: 'error', error: cause instanceof Error ? cause.message : String(cause) });
  } finally {
    await listener.remove();
  }
};

export const cancelModelDownload = async (): Promise<void> => {
  await PhonemeEngine.cancelDownload();
};

/** Tests only. */
export const resetModelDownload = (): void => {
  state = { phase: 'unknown', percent: 0, error: null };
};
