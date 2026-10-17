'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { type ReactElement, useMemo, useState } from 'react';

import { ErrorState } from '@/components/ErrorState/ErrorState';
import { Icon } from '@/components/Icon/Icon';
import { IconButton } from '@/components/IconButton/IconButton';
import { PageIntro } from '@/components/PageIntro/PageIntro';
import { Skeleton } from '@/components/Skeleton/Skeleton';
import { AsyncStatus } from '@/enums/async-status.enum';
import { IconName } from '@/enums/icon-name.enum';
import { StorageKey } from '@/enums/storage-key.enum';
import { getPhonemes, getVisemes } from '@/features/content/services/content.service';
import { MirrorGuide } from '@/features/mirror/components/MirrorGuide';
import { SoundPickerSheet } from '@/features/mirror/components/SoundPickerSheet';
import { useCalibration } from '@/features/mirror/hooks/useCalibration';
import { useMouthTracker } from '@/features/mirror/hooks/useMouthTracker';
import { MouthTutorButton } from '@/features/tutor/components/MouthTutorButton';
import { useAsync } from '@/hooks/useAsync';
import { useCopy } from '@/hooks/useCopy';
import { useImmersive } from '@/hooks/useImmersive';
import { useKeepAwake } from '@/hooks/useKeepAwake';
import { useStoredState } from '@/hooks/useStoredState';
import type { PhonemeCard, VisemeContent } from '@/interfaces/practice.interface';

import './MouthMirror.css';

const loadAll = async (): Promise<{ visemes: VisemeContent; phonemes: PhonemeCard[] }> => {
  const [visemes, phonemes] = await Promise.all([getVisemes(), getPhonemes()]);
  return { visemes, phonemes };
};

/** Full-screen mirror: the camera starts as soon as a calibration exists; controls float on it. */
export const MouthMirror = (): ReactElement => {
  const copy = useCopy();
  const params = useSearchParams();
  const content = useAsync(loadAll);
  const calibration = useCalibration();
  useKeepAwake();
  useImmersive();
  const [muted, setMuted] = useStoredState<boolean>(StorageKey.Muted, false);
  const [isPaused, setIsPaused] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const sound = picked ?? params.get('sound') ?? 'UW';
  const needsCalibration = calibration.isLoaded && calibration.value === null;
  const tracker = useMouthTracker({
    enabled: calibration.isLoaded && !needsCalibration && !isPaused,
    calibration: calibration.value,
  });

  const target = useMemo(
    () => content.data?.visemes.groups.find((group) => group.sounds.includes(sound)) ?? null,
    [content.data, sound],
  );
  const card = content.data?.phonemes.find((item) => item.arpabet === sound) ?? null;

  if (content.status === AsyncStatus.Error) {
    return <ErrorState message={content.error ?? ''} onRetry={content.reload} />;
  }
  if (!content.data || !calibration.isLoaded) return <Skeleton lines={6} />;

  const { visemes, phonemes } = content.data;
  const returnTo = params.get('item');
  const confidenceOf = (arpabet: string): string | null =>
    visemes.groups.find((group) => group.sounds.includes(arpabet))?.confidence ?? null;

  const topStart = (
    <>
      {returnTo ? (
        <Link
          href={{ pathname: '/practice', query: { item: returnTo } }}
          className="mouth-mirror__icon-link"
          aria-label={copy.practice.back}
        >
          <Icon name={IconName.ChevronLeft} />
        </Link>
      ) : null}
      <button
        type="button"
        className="mouth-mirror__chip"
        aria-haspopup="dialog"
        aria-label={`${copy.mirror.pickSound}: /${card?.us ?? sound}/ ${card?.example ?? ''}`}
        onClick={() => setIsPickerOpen(true)}
      >
        <span className="mouth-mirror__chip-ipa">/{card?.us ?? sound}/</span>
        {card ? <span className="mouth-mirror__chip-word">{card.example}</span> : null}
        <Icon name={IconName.ChevronDown} />
      </button>
    </>
  );
  const topEnd = (
    <>
      <IconButton
        icon={isPaused ? IconName.Camera : IconName.Pause}
        label={isPaused ? copy.mirror.resume : copy.mirror.pause}
        isOnBrand
        className="mouth-mirror__control"
        aria-pressed={isPaused}
        onClick={() => setIsPaused(!isPaused)}
      />
      <IconButton
        icon={muted ? IconName.VolumeOff : IconName.Volume}
        label={muted ? copy.mirror.unmute : copy.mirror.mute}
        isOnBrand
        className="mouth-mirror__control"
        aria-pressed={muted}
        onClick={() => setMuted(!muted)}
      />
      <Link
        href={{ pathname: '/calibration', query: { sound } }}
        className="mouth-mirror__icon-link"
        aria-label={copy.mirror.recalibrate}
        title={copy.mirror.recalibrate}
      >
        <Icon name={IconName.Refresh} />
      </Link>
    </>
  );

  return (
    <div className="mouth-mirror">
      <div className="mouth-mirror__intro">
        <PageIntro title={copy.mirror.title} lead={card?.tip} />
      </div>
      {needsCalibration ? (
        <div className="mouth-mirror__gate" role="status">
          <Icon name={IconName.Camera} className="mouth-mirror__gate-icon" />
          <p className="mouth-mirror__gate-text">{copy.mirror.needCalibration}</p>
          <Link
            href={{ pathname: '/calibration', query: { sound } }}
            className="button button--primary button--large"
          >
            {copy.mirror.calibrate}
          </Link>
        </div>
      ) : (
        <MirrorGuide
          sound={sound}
          target={target}
          tracker={tracker}
          muted={muted}
          confidenceLabels={visemes.confidence_labels}
          transitionVi={visemes.transitions[sound] ?? null}
          topStart={topStart}
          topEnd={topEnd}
          tutor={
            !isPaused && target ? (
              <MouthTutorButton
                tracker={tracker}
                soundIpa={card?.us ?? sound}
                targetVi={target.hint_vi}
              />
            ) : null
          }
        />
      )}
      <SoundPickerSheet
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        phonemes={phonemes}
        selected={sound}
        onPick={setPicked}
        confidenceOf={confidenceOf}
        labels={visemes.confidence_labels}
      />
    </div>
  );
};
