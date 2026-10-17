'use client';

import Link from 'next/link';
import { type ReactElement, useState, useSyncExternalStore } from 'react';

import { Button } from '@/components/Button/Button';
import { Card } from '@/components/Card/Card';
import { PageIntro } from '@/components/PageIntro/PageIntro';
import { SectionHeader } from '@/components/SectionHeader/SectionHeader';
import { Tabs } from '@/components/Tabs/Tabs';
import { useToast } from '@/components/Toast/Toast';
import { APP_VERSION } from '@/constants/ui.constant';
import { ButtonVariant } from '@/enums/button-variant.enum';
import { Language } from '@/enums/language.enum';
import { StorageKey } from '@/enums/storage-key.enum';
import { Theme } from '@/enums/theme.enum';
import { getHealth } from '@/features/health/services/health.service';
import { clearCalibration } from '@/features/mirror/services/calibration.service';
import { GoalCard } from '@/features/settings/components/GoalCard';
import { PairingCard } from '@/features/settings/components/PairingCard';
import { ProfilesCard } from '@/features/settings/components/ProfilesCard';
import { useCopy, useLanguage } from '@/hooks/useCopy';
import { useStoredState } from '@/hooks/useStoredState';
import { setLanguage } from '@/locales';
import { normaliseBaseUrl } from '@/utils/api-base.util';
import { removeStorage, writeStorage } from '@/utils/storage.util';

import './SettingsScreen.css';

const subscribeTheme = (listener: () => void): (() => void) => {
  const observer = new MutationObserver(listener);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => observer.disconnect();
};
const readTheme = (): Theme =>
  document.documentElement.dataset.theme === Theme.Dark ? Theme.Dark : Theme.Light;

/** Theme, practice defaults, scoring-server address and on-device data. */
export const SettingsScreen = (): ReactElement => {
  const copy = useCopy();
  const language = useLanguage();
  const toast = useToast();
  const theme = useSyncExternalStore(subscribeTheme, readTheme, () => Theme.Light);
  const [cameraDefault, setCameraDefault] = useStoredState<boolean>(
    StorageKey.CameraDefault,
    false,
  );
  const [muted, setMuted] = useStoredState<boolean>(StorageKey.Muted, false);
  const [server, setServer] = useStoredState<string>(StorageKey.ApiBaseUrl, '');
  const [draft, setDraft] = useState<string | null>(null);
  const [serverStatus, setServerStatus] = useState<string | null>(null);
  const setTheme = (next: Theme): void => {
    document.documentElement.dataset.theme = next;
    writeStorage(StorageKey.Theme, next);
  };

  const checkServer = async (): Promise<void> => {
    const next = normaliseBaseUrl(draft ?? server);
    setServer(next);
    setDraft(null);
    const health = await getHealth().catch(() => null);
    setServerStatus(
      health
        ? copy.progress.serverOk(health.tutor_available ? health.tutor_model : null)
        : copy.progress.serverFail,
    );
    if (health) toast.show(copy.settings.saved, 'success');
  };

  const clearData = (): void => {
    clearCalibration();
    removeStorage(StorageKey.CameraDefault);
    removeStorage(StorageKey.Muted);
    removeStorage(StorageKey.ApiBaseUrl);
    removeStorage(StorageKey.DailyGoal);
    toast.show(copy.settings.dataCleared, 'success');
  };

  return (
    <div className="settings-screen">
      <PageIntro title={copy.settings.title} lead={copy.settings.lead} />

      <Card as="section" aria-labelledby="settings-appearance">
        <SectionHeader id="settings-appearance" title={copy.settings.appearance} />
        <Tabs
          label={copy.settings.appearance}
          value={theme}
          options={[
            { id: Theme.Light, label: copy.settings.themeLight },
            { id: Theme.Dark, label: copy.settings.themeDark },
          ]}
          onChange={setTheme}
        />
        <SectionHeader
          id="settings-language"
          title={copy.settings.language}
          hint={copy.settings.languageHint}
        />
        <Tabs
          label={copy.settings.language}
          value={language}
          options={[
            { id: Language.Vi, label: copy.settings.languageVi },
            { id: Language.En, label: copy.settings.languageEn },
          ]}
          onChange={setLanguage}
        />
      </Card>

      <ProfilesCard />

      <GoalCard />

      <Card as="section" aria-labelledby="settings-practice">
        <SectionHeader id="settings-practice" title={copy.settings.practice} />
        <label className="settings-screen__row">
          <input
            type="checkbox"
            checked={cameraDefault}
            onChange={(event) => setCameraDefault(event.target.checked)}
          />
          <span>{copy.progress.cameraDefault}</span>
        </label>
        <label className="settings-screen__row">
          <input
            type="checkbox"
            checked={muted}
            onChange={(event) => setMuted(event.target.checked)}
          />
          <span>{copy.progress.muted}</span>
        </label>
      </Card>

      <Card as="section" aria-labelledby="settings-server">
        <SectionHeader
          id="settings-server"
          title={copy.settings.server}
          hint={copy.progress.serverHelp}
        />
        <label className="settings-screen__label" htmlFor="server-address">
          {copy.progress.serverTitle}
        </label>
        <div className="settings-screen__row">
          <input
            id="server-address"
            className="settings-screen__input"
            type="url"
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            placeholder={copy.progress.serverPlaceholder}
            value={draft ?? server}
            onChange={(event) => setDraft(event.target.value)}
          />
          <Button variant={ButtonVariant.Secondary} isSmall onClick={() => void checkServer()}>
            {copy.progress.serverSave}
          </Button>
        </div>
        {serverStatus ? (
          <p className="settings-screen__status" role="status">
            {serverStatus}
          </p>
        ) : null}
      </Card>

      <PairingCard />

      <Card as="section" aria-labelledby="settings-data">
        <SectionHeader
          id="settings-data"
          title={copy.settings.data}
          hint={copy.settings.clearDataHint}
        />
        <div className="settings-screen__row">
          <Button variant={ButtonVariant.Ghost} isSmall onClick={clearData}>
            {copy.settings.clearData}
          </Button>
        </div>
      </Card>

      <Card as="section" aria-labelledby="settings-about">
        <SectionHeader id="settings-about" title={copy.settings.about} />
        <p className="settings-screen__muted">
          {copy.appName} · {copy.settings.version} {APP_VERSION}
        </p>
        <p className="settings-screen__muted">{copy.home.privacy}</p>
        <Link href="/welcome" className="button button--ghost button--small">
          {copy.settings.replayWelcome}
        </Link>
      </Card>
    </div>
  );
};
