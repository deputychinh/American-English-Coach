'use client';

import Link from 'next/link';
import { type ReactElement, useState, useSyncExternalStore } from 'react';

import { Button } from '@/components/Button/Button';
import { PageIntro } from '@/components/PageIntro/PageIntro';
import { SectionHeader } from '@/components/SectionHeader/SectionHeader';
import { Tabs } from '@/components/Tabs/Tabs';
import { useToast } from '@/components/Toast/Toast';
import { DEFAULT_DAILY_GOAL } from '@/constants/plan.constant';
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
import { SettingsRow } from '@/features/settings/components/SettingsRow';
import { pairedDevice } from '@/features/settings/services/pairing.service';
import { useActiveProfile } from '@/hooks/useActiveProfile';
import { useCopy, useLanguage } from '@/hooks/useCopy';
import { useStoredState } from '@/hooks/useStoredState';
import { setLanguage } from '@/locales';
import { normaliseBaseUrl, isNativeShell } from '@/utils/api-base.util';
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
const subscribeNever = (): (() => void) => () => undefined;

const HASH_ROWS: Record<string, string> = { 'settings-pairing': 'pairing', profiles: 'profiles' };
const readHashRow = (): string | null => HASH_ROWS[window.location.hash.replace('#', '')] ?? null;

export const SettingsScreen = (): ReactElement => {
  const copy = useCopy();
  const language = useLanguage();
  const toast = useToast();
  const theme = useSyncExternalStore(subscribeTheme, readTheme, () => Theme.Light);
  // Inside the iOS shell pairing is the first thing a new phone needs, so the card leads.
  // External-store read: the static HTML says false, the shell flips it after hydration.
  const isPairingFirst = useSyncExternalStore(subscribeNever, isNativeShell, () => false);

  const [cameraDefault, setCameraDefault] = useStoredState<boolean>(StorageKey.CameraDefault, true);
  const [muted, setMuted] = useStoredState<boolean>(StorageKey.Muted, false);
  const [goal] = useStoredState<number>(StorageKey.DailyGoal, DEFAULT_DAILY_GOAL);
  const profile = useActiveProfile();
  // Links such as the pairing banner ("/settings#settings-pairing") open the matching sheet;
  // until the learner opens or closes one, the hash decides.
  const hashRow = useSyncExternalStore(subscribeNever, readHashRow, () => null);
  const [chosenRow, setChosenRow] = useState<string | null | undefined>(undefined);
  const openRow = chosenRow === undefined ? hashRow : chosenRow;
  // Read again whenever a sheet closes, so the row shows the state the pairing sheet left.
  const paired = openRow === null ? pairedDevice() : null;
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
      <PageIntro title={copy.settings.title} />

      <ul className="settings-screen__rows" aria-label={copy.settings.appearance}>
        <li className="settings-screen__inline">
          <span className="settings-screen__inline-label">{copy.settings.appearance}</span>
          <Tabs
            label={copy.settings.appearance}
            value={theme}
            options={[
              { id: Theme.Light, label: copy.settings.themeLight },
              { id: Theme.Dark, label: copy.settings.themeDark },
            ]}
            onChange={setTheme}
          />
        </li>
        <li className="settings-screen__inline">
          <span className="settings-screen__inline-label">{copy.settings.language}</span>
          <Tabs
            label={copy.settings.language}
            value={language}
            options={[
              { id: Language.Vi, label: copy.settings.languageVi },
              { id: Language.En, label: copy.settings.languageEn },
            ]}
            onChange={setLanguage}
          />
        </li>
      </ul>

      <section className="settings-screen__group" aria-labelledby="settings-group-learning">
        <h2 id="settings-group-learning" className="settings-screen__group-title">
          {copy.settings.rows.groupLearning}
        </h2>
        <ul className="settings-screen__rows">
          {isPairingFirst ? (
            <SettingsRow
              label={copy.settings.pairingTitle}
              value={paired ? copy.settings.rows.pairedValue : copy.settings.rows.notPaired}
              isOpen={openRow === 'pairing'}
              onOpen={() => setChosenRow('pairing')}
              onClose={() => setChosenRow(null)}
            >
              <PairingCard />
            </SettingsRow>
          ) : null}
          <SettingsRow
            label={copy.settings.profiles.title}
            value={profile.name}
            isOpen={openRow === 'profiles'}
            onOpen={() => setChosenRow('profiles')}
            onClose={() => setChosenRow(null)}
          >
            <ProfilesCard />
          </SettingsRow>
          <SettingsRow
            label={copy.settings.goalTitle}
            value={copy.settings.rows.goalValue(goal)}
            isOpen={openRow === 'goal'}
            onOpen={() => setChosenRow('goal')}
            onClose={() => setChosenRow(null)}
          >
            <GoalCard />
          </SettingsRow>
          <SettingsRow
            label={copy.settings.practice}
            value={cameraDefault ? copy.settings.rows.cameraOn : copy.settings.rows.cameraOff}
            isOpen={openRow === 'practice'}
            onOpen={() => setChosenRow('practice')}
            onClose={() => setChosenRow(null)}
          >
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
          </SettingsRow>
        </ul>
      </section>

      <section className="settings-screen__group" aria-labelledby="settings-group-server">
        <h2 id="settings-group-server" className="settings-screen__group-title">
          {copy.settings.rows.groupServer}
        </h2>
        <ul className="settings-screen__rows">
          <SettingsRow
            label={copy.progress.serverTitle}
            value={server || copy.settings.rows.serverLocal}
            isOpen={openRow === 'server'}
            onOpen={() => setChosenRow('server')}
            onClose={() => setChosenRow(null)}
          >
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
          </SettingsRow>
          {isPairingFirst ? null : (
            <SettingsRow
              label={copy.settings.pairingTitle}
              value={paired ? copy.settings.rows.pairedValue : copy.settings.rows.notPaired}
              isOpen={openRow === 'pairing'}
              onOpen={() => setChosenRow('pairing')}
              onClose={() => setChosenRow(null)}
            >
              <PairingCard />
            </SettingsRow>
          )}
        </ul>
      </section>

      <section className="settings-screen__group" aria-labelledby="settings-group-other">
        <h2 id="settings-group-other" className="settings-screen__group-title">
          {copy.settings.rows.groupOther}
        </h2>
        <ul className="settings-screen__rows">
          <SettingsRow
            label={copy.settings.data}
            isOpen={openRow === 'data'}
            onOpen={() => setChosenRow('data')}
            onClose={() => setChosenRow(null)}
          >
            <SectionHeader
              id="settings-data"
              title={copy.settings.data}
              hint={copy.settings.clearDataHint}
            />
            <div className="settings-screen__row">
              <Button variant={ButtonVariant.Ghost} isSmall onClick={clearData}>
                {copy.settings.clearData}
              </Button>
              <Link href="/privacy" className="button button--ghost button--small">
                {copy.privacy.title}
              </Link>
            </div>
          </SettingsRow>
          <SettingsRow
            label={copy.settings.about}
            value={`${copy.settings.version} ${APP_VERSION}`}
            isOpen={openRow === 'about'}
            onOpen={() => setChosenRow('about')}
            onClose={() => setChosenRow(null)}
          >
            <SectionHeader id="settings-about" title={copy.settings.about} />
            <p className="settings-screen__muted">
              {copy.appName} · {copy.settings.version} {APP_VERSION}
            </p>
            <p className="settings-screen__muted">{copy.home.privacy}</p>
            <Link href="/welcome" className="button button--ghost button--small">
              {copy.settings.replayWelcome}
            </Link>
          </SettingsRow>
        </ul>
      </section>
    </div>
  );
};
