'use client';

import { type ReactElement, useState } from 'react';

import { Button } from '@/components/Button/Button';
import { COPY } from '@/constants/copy.constant';
import { ButtonVariant } from '@/enums/button-variant.enum';
import { StorageKey } from '@/enums/storage-key.enum';
import { getHealth } from '@/features/health/services/health.service';
import { clearCalibration } from '@/features/mirror/services/calibration.service';
import { useStoredState } from '@/hooks/useStoredState';
import { normaliseBaseUrl } from '@/utils/api-base.util';

import './SettingsPanel.css';

export const SettingsPanel = (): ReactElement => {
  const [cameraDefault, setCameraDefault] = useStoredState<boolean>(
    StorageKey.CameraDefault,
    false,
  );
  const [muted, setMuted] = useStoredState<boolean>(StorageKey.Muted, false);
  const [cleared, setCleared] = useState(false);
  const [server, setServer] = useStoredState<string>(StorageKey.ApiBaseUrl, '');
  const [draft, setDraft] = useState<string | null>(null);
  const [serverStatus, setServerStatus] = useState<string | null>(null);
  const checkServer = async (): Promise<void> => {
    const next = normaliseBaseUrl(draft ?? server);
    setServer(next);
    setDraft(null);
    const health = await getHealth().catch(() => null);
    setServerStatus(
      health
        ? COPY.progress.serverOk(health.tutor_available ? health.tutor_model : null)
        : COPY.progress.serverFail,
    );
  };
  return (
    <section className="settings-panel" aria-labelledby="settings-title">
      <h2 id="settings-title" className="settings-panel__heading">
        {COPY.progress.settings}
      </h2>
      <label className="settings-panel__row">
        <input
          type="checkbox"
          checked={cameraDefault}
          onChange={(event) => setCameraDefault(event.target.checked)}
        />
        <span>{COPY.progress.cameraDefault}</span>
      </label>
      <label className="settings-panel__row">
        <input
          type="checkbox"
          checked={muted}
          onChange={(event) => setMuted(event.target.checked)}
        />
        <span>{COPY.progress.muted}</span>
      </label>
      <div className="settings-panel__row">
        <Button
          variant={ButtonVariant.Ghost}
          isSmall
          onClick={() => {
            clearCalibration();
            setCleared(true);
          }}
        >
          {COPY.progress.resetCalibration}
        </Button>
        {cleared ? <span role="status">{COPY.progress.calibrationCleared}</span> : null}
      </div>
      <div className="settings-panel__server">
        <label className="settings-panel__label" htmlFor="server-address">
          {COPY.progress.serverTitle}
        </label>
        <p className="settings-panel__help">{COPY.progress.serverHelp}</p>
        <div className="settings-panel__row">
          <input
            id="server-address"
            className="settings-panel__input"
            type="url"
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            placeholder={COPY.progress.serverPlaceholder}
            value={draft ?? server}
            onChange={(event) => setDraft(event.target.value)}
          />
          <Button variant={ButtonVariant.Secondary} isSmall onClick={() => void checkServer()}>
            {COPY.progress.serverSave}
          </Button>
        </div>
        {serverStatus ? (
          <p className="settings-panel__status" role="status">
            {serverStatus}
          </p>
        ) : null}
      </div>
    </section>
  );
};
