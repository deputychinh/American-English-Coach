'use client';

import { type ReactElement, useState } from 'react';

import { Button } from '@/components/Button/Button';
import { Card } from '@/components/Card/Card';
import { SectionHeader } from '@/components/SectionHeader/SectionHeader';
import { useToast } from '@/components/Toast/Toast';
import { PAIR_CODE_LENGTH } from '@/constants/api.constant';
import { ButtonVariant } from '@/enums/button-variant.enum';
import {
  guessDeviceName,
  pairDevice,
  pairedDevice,
  unpairDevice,
} from '@/features/settings/services/pairing.service';
import { useCopy } from '@/hooks/useCopy';

/** Exchange the 6-digit code shown by `make api-lan` for a device token kept on this phone. */
export const PairingCard = (): ReactElement => {
  const copy = useCopy();
  const toast = useToast();
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

  return (
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
  );
};
