'use client';

import type { ReactElement } from 'react';

import { Button } from '@/components/Button/Button';
import { ENGINE_MODEL_MEGABYTES } from '@/constants/engine.constant';
import { ButtonVariant } from '@/enums/button-variant.enum';
import { InstallPlatform } from '@/enums/install-platform.enum';
import { useModelDownload } from '@/features/engine/hooks/useModelDownload';
import {
  cancelModelDownload,
  startModelDownload,
} from '@/features/engine/services/model-download.service';
import { useInstallOffer } from '@/features/install/hooks/useInstallOffer';
import { useCopy } from '@/hooks/useCopy';
import { cx } from '@/utils/cx.util';

import './ModelDownloadCard.css';

interface ModelDownloadCardProps {
  /** Show the "ready" line too (settings); home hides the card once the pack is there. */
  isReadyShown?: boolean;
}

/**
 * The one-time scoring pack download (App Store 4.2.3(ii): size shown, learner starts it).
 * Renders nothing outside the iOS app or before the device has been asked.
 */
export const ModelDownloadCard = ({
  isReadyShown = false,
}: ModelDownloadCardProps): ReactElement | null => {
  const copy = useCopy();
  const download = useModelDownload();
  // Safari drops a site's storage after 7 days unused unless it is on the home screen.
  const isIosTab = useInstallOffer() === InstallPlatform.Ios;
  if (download.phase === 'unknown') return null;
  if (download.phase === 'ready') {
    return isReadyShown ? (
      <p className="model-download-card__ready">{copy.engine.packReady}</p>
    ) : null;
  }
  const isDownloading = download.phase === 'downloading';
  return (
    <section
      className={cx('model-download-card', isDownloading && 'is-downloading')}
      aria-live="polite"
    >
      <h2 className="model-download-card__title">{copy.engine.packTitle}</h2>
      {isDownloading ? (
        <>
          <p className="model-download-card__body">{copy.engine.packProgress(download.percent)}</p>
          <div
            className="model-download-card__bar"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={download.percent}
            aria-label={copy.engine.packTitle}
          >
            <span
              className="model-download-card__fill"
              style={{ width: `${String(download.percent)}%` }}
            />
          </div>
          <Button isSmall variant={ButtonVariant.Ghost} onClick={() => void cancelModelDownload()}>
            {copy.engine.cancel}
          </Button>
        </>
      ) : (
        <>
          <p className="model-download-card__body">
            {copy.engine.packBody(ENGINE_MODEL_MEGABYTES)}
          </p>
          {isIosTab ? (
            <p className="model-download-card__note">{copy.engine.packInstallFirst}</p>
          ) : null}
          {download.phase === 'error' && download.error ? (
            <p className="model-download-card__error" role="alert">
              {copy.engine.packFailed(download.error)}
            </p>
          ) : null}
          <Button isSmall onClick={() => void startModelDownload()}>
            {download.phase === 'error' ? copy.engine.packRetry : copy.engine.packStart}
          </Button>
        </>
      )}
    </section>
  );
};
