'use client';

import { type ReactElement, useState, useSyncExternalStore } from 'react';

import { Button } from '@/components/Button/Button';
import { Card } from '@/components/Card/Card';
import { PageIntro } from '@/components/PageIntro/PageIntro';
import { SectionHeader } from '@/components/SectionHeader/SectionHeader';
import { Tabs } from '@/components/Tabs/Tabs';
import { useToast } from '@/components/Toast/Toast';
import { PAIR_CODE_LENGTH } from '@/constants/api.constant';
import { APP_VERSION } from '@/constants/ui.constant';
import { ButtonVariant } from '@/enums/button-variant.enum';
import { StorageKey } from '@/enums/storage-key.enum';
import { Theme } from '@/enums/theme.enum';
import { getHealth } from '@/features/health/services/health.service';
import { clearCalibration } from '@/features/mirror/services/calibration.service';
import { ProfilesCard } from '@/features/settings/components/ProfilesCard';
import {
  guessDeviceName,
  pairDevice,
  pairedDevice,
  unpairDevice,
} from '@/features/settings/services/pairing.service';
import { useCopy } from '@/hooks/useCopy';
import { useStoredState } from '@/hooks/useStoredState';
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
  const [paired, setPaired] = useState(() => pairedDevice());
  const [code, setCode] = useState('');
  const [deviceName, setDeviceName] = useState(() =>
    guessDeviceName(copy.settings.defaultDeviceName),
  );
  const [pairStatus, setPairStatus] = useState<string | null>(null);

  const pair = async (): Promise<void> => {
    try {
      const result = await pairDevice(
        code.trim(),
        deviceName.trim() || copy.settings.defaultDeviceName,
      );
      setPaired(result);
      setCode('');
      setPairStatus(copy.settings.pairingDone);
      toast.show(copy.settings.pairingDone, 'success');
    } catch {
      setPairStatus(copy.settings.pairingFailed);
    }
  };
  const unpair = (): void => {
    unpairDevice();
    setPaired(null);
    setPairStatus(copy.settings.unpaired);
  };

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
      </Card>

      <ProfilesCard />

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

      <Card as="section" aria-labelledby="settings-pairing">
        <SectionHeader
          id="settings-pairing"
          title={copy.settings.pairingTitle}
          hint={copy.settings.pairingHelp}
        />
        {paired ? (
          <div className="settings-screen__row">
            <span className="settings-screen__paired" role="status">
              {copy.settings.paired(paired.deviceName)}
            </span>
            <Button variant={ButtonVariant.Ghost} isSmall onClick={unpair}>
              {copy.settings.unpair}
            </Button>
          </div>
        ) : (
          <div className="settings-screen__pairing">
            <label className="settings-screen__field">
              <span className="settings-screen__label">{copy.settings.pairingCode}</span>
              <input
                className="settings-screen__input settings-screen__input--code"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={PAIR_CODE_LENGTH}
                autoComplete="one-time-code"
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
              />
            </label>
            <label className="settings-screen__field">
              <span className="settings-screen__label">{copy.settings.pairingDevice}</span>
              <input
                className="settings-screen__input"
                value={deviceName}
                onChange={(event) => setDeviceName(event.target.value)}
              />
            </label>
            <Button isSmall disabled={code.length !== PAIR_CODE_LENGTH} onClick={() => void pair()}>
              {copy.settings.pair}
            </Button>
          </div>
        )}
        {pairStatus ? (
          <p className="settings-screen__status" role="status">
            {pairStatus}
          </p>
        ) : null}
      </Card>

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
      </Card>
    </div>
  );
};
