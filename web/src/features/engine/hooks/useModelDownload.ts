import { useEffect, useSyncExternalStore } from 'react';

import {
  modelDownloadState,
  refreshModelDownload,
  subscribeModelDownload,
} from '@/features/engine/services/model-download.service';
import type { ModelDownloadState } from '@/interfaces/model-download.interface';

const SERVER_STATE: ModelDownloadState = { phase: 'unknown', percent: 0, error: null };

/** The shared download state; checks the device once on mount. */
export const useModelDownload = (): ModelDownloadState => {
  useEffect(() => {
    void refreshModelDownload();
  }, []);
  return useSyncExternalStore(subscribeModelDownload, modelDownloadState, () => SERVER_STATE);
};
