'use client';

import { type ReactElement, useState } from 'react';

import { Button } from '@/components/Button/Button';
import { COPY } from '@/constants/copy.constant';
import { ButtonVariant } from '@/enums/button-variant.enum';
import { StorageKey } from '@/enums/storage-key.enum';
import { clearCalibration } from '@/features/mirror/services/calibration.service';
import { useStoredState } from '@/hooks/useStoredState';

import './SettingsPanel.css';

export const SettingsPanel = (): ReactElement => {
  const [cameraDefault, setCameraDefault] = useStoredState<boolean>(
    StorageKey.CameraDefault,
    false,
  );
  const [muted, setMuted] = useStoredState<boolean>(StorageKey.Muted, false);
  const [cleared, setCleared] = useState(false);
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
    </section>
  );
};
