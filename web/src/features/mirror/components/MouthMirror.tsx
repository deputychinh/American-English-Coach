'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { type ReactElement, useMemo, useState } from 'react';

import { Button } from '@/components/Button/Button';
import { ErrorState } from '@/components/ErrorState/ErrorState';
import { PageIntro } from '@/components/PageIntro/PageIntro';
import { Skeleton } from '@/components/Skeleton/Skeleton';
import { AsyncStatus } from '@/enums/async-status.enum';
import { ButtonVariant } from '@/enums/button-variant.enum';
import { StorageKey } from '@/enums/storage-key.enum';
import { getPhonemes, getVisemes } from '@/features/content/services/content.service';
import { CameraPanel } from '@/features/mirror/components/CameraPanel';
import { MirrorGuide } from '@/features/mirror/components/MirrorGuide';
import { useCalibration } from '@/features/mirror/hooks/useCalibration';
import { useMouthTracker } from '@/features/mirror/hooks/useMouthTracker';
import { MouthTutorButton } from '@/features/tutor/components/MouthTutorButton';
import { useAsync } from '@/hooks/useAsync';
import { useCopy } from '@/hooks/useCopy';
import { useKeepAwake } from '@/hooks/useKeepAwake';
import { useStoredState } from '@/hooks/useStoredState';
import type { PhonemeCard, VisemeContent } from '@/interfaces/practice.interface';

import './MouthMirror.css';

const loadAll = async (): Promise<{ visemes: VisemeContent; phonemes: PhonemeCard[] }> => {
  const [visemes, phonemes] = await Promise.all([getVisemes(), getPhonemes()]);
  return { visemes, phonemes };
};

export const MouthMirror = (): ReactElement => {
  const copy = useCopy();
  const params = useSearchParams();
  const content = useAsync(loadAll);
  const calibration = useCalibration();
  useKeepAwake();
  const [muted, setMuted] = useStoredState<boolean>(StorageKey.Muted, false);
  const [cameraOn, setCameraOn] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const sound = picked ?? params.get('sound') ?? 'UW';
  const tracker = useMouthTracker({ enabled: cameraOn, calibration: calibration.value });

  const target = useMemo(
    () => content.data?.visemes.groups.find((group) => group.sounds.includes(sound)) ?? null,
    [content.data, sound],
  );
  const card = content.data?.phonemes.find((item) => item.arpabet === sound) ?? null;

  if (content.status === AsyncStatus.Error) {
    return <ErrorState message={content.error ?? ''} onRetry={content.reload} />;
  }
  if (!content.data || !calibration.isLoaded) return <Skeleton lines={6} />;

  const needsCalibration = calibration.value === null;
  const returnTo = params.get('item');

  return (
    <div className="mouth-mirror">
      <PageIntro title={copy.mirror.title} lead={card?.tip}>
        <label className="mouth-mirror__picker">
          <span className="visually-hidden">{copy.mirror.pickSound}</span>
          <select
            className="select"
            value={sound}
            onChange={(event) => setPicked(event.target.value)}
          >
            {content.data.phonemes.map((item) => (
              <option key={item.id} value={item.arpabet}>
                /{item.us}/ · {item.example}
              </option>
            ))}
          </select>
        </label>
        {returnTo ? (
          <Link
            href={{ pathname: '/practice', query: { item: returnTo } }}
            className="button button--ghost"
          >
            {copy.practice.back}
          </Link>
        ) : null}
      </PageIntro>

      {needsCalibration ? (
        <div className="mouth-mirror__notice" role="status">
          <p>{copy.mirror.needCalibration}</p>
          <Link
            href={{ pathname: '/calibration', query: { sound } }}
            className="button button--primary"
          >
            {copy.mirror.calibrate}
          </Link>
        </div>
      ) : (
        <div className="mouth-mirror__controls">
          <Button onClick={() => setCameraOn(!cameraOn)} aria-pressed={cameraOn}>
            {cameraOn ? copy.mirror.stopCamera : copy.mirror.startCamera}
          </Button>
          <Button
            variant={ButtonVariant.Ghost}
            onClick={() => setMuted(!muted)}
            aria-pressed={muted}
          >
            {muted ? copy.mirror.unmute : copy.mirror.mute}
          </Button>
          <Link
            href={{ pathname: '/calibration', query: { sound } }}
            className="button button--ghost"
          >
            {copy.mirror.recalibrate}
          </Link>
        </div>
      )}

      {!needsCalibration ? (
        <MirrorGuide
          sound={sound}
          target={target}
          features={cameraOn ? tracker.latest : null}
          muted={muted}
          camera={<CameraPanel tracker={tracker} />}
          confidenceLabels={content.data.visemes.confidence_labels}
          transitionVi={content.data.visemes.transitions[sound] ?? null}
          tutor={
            cameraOn && target ? (
              <MouthTutorButton
                tracker={tracker}
                soundIpa={card?.us ?? sound}
                targetVi={target.hint_vi}
              />
            ) : null
          }
        />
      ) : null}
    </div>
  );
};
