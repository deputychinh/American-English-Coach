'use client';

import type { ReactElement } from 'react';

import { Button } from '@/components/Button/Button';
import { ButtonVariant } from '@/enums/button-variant.enum';
import { InstallPlatform } from '@/enums/install-platform.enum';
import { StorageKey } from '@/enums/storage-key.enum';
import { useInstallOffer } from '@/features/install/hooks/useInstallOffer';
import { promptInstall } from '@/features/install/services/install-prompt.service';
import { useCopy } from '@/hooks/useCopy';
import { useStoredState } from '@/hooks/useStoredState';

import './InstallAppCard.css';

/**
 * Home → "add the app to your home screen": the browser's own install button where there is
 * one (Android, desktop Chrome and Edge), the Share-menu steps on iPhone and iPad. Hidden once
 * installed, inside the iOS app, or after "Not now".
 */
export const InstallAppCard = (): ReactElement | null => {
  const copy = useCopy();
  const platform = useInstallOffer();
  const [isDismissed, setIsDismissed] = useStoredState<boolean>(StorageKey.InstallDismissed, false);
  if (platform === InstallPlatform.None || isDismissed) return null;
  return (
    <section className="install-app-card" aria-labelledby="install-app-title">
      <h2 id="install-app-title" className="install-app-card__title">
        {copy.install.title}
      </h2>
      <p className="install-app-card__body">{copy.install.body}</p>
      {platform === InstallPlatform.Ios ? (
        <ol className="install-app-card__steps">
          {copy.install.iosSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      ) : null}
      <div className="install-app-card__actions">
        {platform === InstallPlatform.Prompt ? (
          <Button isSmall onClick={() => void promptInstall()}>
            {copy.install.action}
          </Button>
        ) : null}
        <Button isSmall variant={ButtonVariant.Ghost} onClick={() => setIsDismissed(true)}>
          {copy.install.later}
        </Button>
      </div>
    </section>
  );
};
