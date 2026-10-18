'use client';

import Link from 'next/link';
import { type ReactElement, type ReactNode, useCallback, useState } from 'react';

import { ConfidenceBadge } from '@/components/ConfidenceBadge/ConfidenceBadge';
import { ErrorState } from '@/components/ErrorState/ErrorState';
import { Icon } from '@/components/Icon/Icon';
import { IconButton } from '@/components/IconButton/IconButton';
import { Sheet } from '@/components/Sheet/Sheet';
import { Skeleton } from '@/components/Skeleton/Skeleton';
import { IconName } from '@/enums/icon-name.enum';
import { PracticeStatus } from '@/enums/practice-status.enum';
import { RecorderStatus } from '@/enums/recorder-status.enum';
import { StorageKey } from '@/enums/storage-key.enum';
import { CameraStage } from '@/features/mirror/components/CameraStage';
import { useCalibration } from '@/features/mirror/hooks/useCalibration';
import { useMouthTracker } from '@/features/mirror/hooks/useMouthTracker';
import { ResultCard } from '@/features/practice/components/ResultCard';
import { useRecorder } from '@/features/practice/hooks/useRecorder';
import { useReferenceAudio } from '@/features/practice/hooks/useReferenceAudio';
import { assess } from '@/features/practice/services/assessment.service';
import { MouthTutorButton } from '@/features/tutor/components/MouthTutorButton';
import { useCopy } from '@/hooks/useCopy';
import { useImmersive } from '@/hooks/useImmersive';
import { useKeepAwake } from '@/hooks/useKeepAwake';
import { useStoredState } from '@/hooks/useStoredState';
import type { Point2 } from '@/interfaces/mouth.interface';
import type {
  AssessmentResponse,
  PracticeItem,
  Recording,
  VisemeTargetCard,
} from '@/interfaces/practice.interface';
import { cx } from '@/utils/cx.util';
import { medianOutline } from '@/utils/lip-outline.util';

import './PracticeSession.css';

interface PracticeSessionProps {
  item: PracticeItem;
  /** Viseme target of the drill's sound, drawn as ghost lips over the inset camera. */
  targetGroup?: VisemeTargetCard | null;
  targetIpa?: string;
  transitionVi?: string | null;
  onResult?: (result: AssessmentResponse) => void;
  /** Drill navigation (next / skip): in the bar while recording, in the result sheet after. */
  extraActions?: ReactNode;
  /** Drill progress line shown under the top bar, inside the one-screen layout. */
  banner?: ReactNode;
}

/**
 * One screen: a thin bar, the prompt in the middle (with an optional inset camera), the record
 * control at the bottom. The result slides up as a sheet so the prompt never scrolls away.
 */
export const PracticeSession = ({
  item,
  targetGroup = null,
  targetIpa,
  transitionVi = null,
  onResult,
  extraActions,
  banner,
}: PracticeSessionProps): ReactElement => {
  const copy = useCopy();
  const [status, setStatus] = useState(PracticeStatus.Idle);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AssessmentResponse | null>(null);
  const [isResultOpen, setIsResultOpen] = useState(false);
  const [recording, setRecording] = useState<Recording | null>(null);
  const [cameraOn, setCameraOn] = useStoredState<boolean>(StorageKey.CameraDefault, false);
  const recorder = useRecorder();
  useKeepAwake();
  useImmersive();
  const reference = useReferenceAudio();
  const calibration = useCalibration();
  const tracker = useMouthTracker({ enabled: cameraOn, calibration: calibration.value });

  const begin = useCallback(async () => {
    setResult(null);
    setIsResultOpen(false);
    setError(null);
    await recorder.start();
    setStatus(PracticeStatus.Recording);
  }, [recorder]);

  const finish = useCallback(async () => {
    const captured = await recorder.stop();
    if (!captured) return;
    setRecording(captured);
    setStatus(PracticeStatus.Scoring);
    const endedAt = captured.startedAt + captured.durationSeconds;
    const frames = cameraOn
      ? tracker.framesBetween(captured.startedAt, endedAt).map(({ t, features, quality }) => ({
          t,
          features,
          quality,
        }))
      : [];
    try {
      const response = await assess({
        item,
        audio: captured.blob,
        mouthFrames: frames,
        audioStartedAt: cameraOn && frames.length > 0 ? captured.startedAt : null,
      });
      setResult(response);
      setIsResultOpen(true);
      setStatus(PracticeStatus.Success);
      onResult?.(response);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setStatus(PracticeStatus.Error);
    }
  }, [cameraOn, item, onResult, recorder, tracker]);

  const outlineAt = useCallback(
    (start: number, end: number): Point2[] => {
      if (!recording) return [];
      const frames = tracker.framesBetween(recording.startedAt + start, recording.startedAt + end);
      return medianOutline(frames.map((frame) => frame.outline));
    },
    [recording, tracker],
  );

  const isRecording = recorder.status === RecorderStatus.Recording;
  const isScoring = status === PracticeStatus.Scoring;
  const level = Math.round(Math.min(1, recorder.level * 4) * 100);
  const kindLabel = copy.practice.kind[item.kind];

  return (
    <div className={cx('practice-session', cameraOn && 'practice-session--camera')}>
      <header className="practice-session__bar">
        <Link href="/practice" className="practice-session__back" aria-label={copy.practice.back}>
          <Icon name={IconName.ChevronLeft} />
        </Link>
        <div className="practice-session__heading">
          <h1 className="practice-session__title">{item.title}</h1>
          <p className="practice-session__kind">
            {kindLabel}
            {targetIpa ? ` · ${copy.practice.targetLabel} /${targetIpa}/` : ''}
          </p>
        </div>
        <IconButton
          icon={IconName.Camera}
          label={cameraOn ? copy.practice.cameraOff : copy.practice.cameraOn}
          aria-pressed={cameraOn}
          className={cx('practice-session__toggle', cameraOn && 'is-on')}
          onClick={() => setCameraOn(!cameraOn)}
        />
      </header>
      {banner}

      <section className="practice-session__stage" aria-label={copy.practice.promptAria}>
        {cameraOn ? (
          <div className="practice-session__pip">
            <CameraStage tracker={tracker} ghost={targetGroup?.group ?? null} isCompact />
          </div>
        ) : null}
        <p className="practice-session__text">{item.text}</p>
        {targetGroup ? (
          <div className="practice-session__target">
            <ConfidenceBadge confidence={targetGroup.confidence} />
            <p className="practice-session__hint">{targetGroup.hint_vi}</p>
            {transitionVi ? <p className="practice-session__muted">{transitionVi}</p> : null}
          </div>
        ) : null}
        {cameraOn && targetGroup ? (
          <MouthTutorButton
            tracker={tracker}
            soundIpa={targetIpa ?? item.focus[0] ?? ''}
            targetVi={targetGroup.hint_vi}
          />
        ) : null}
        {reference.error ? <p className="practice-session__error">{reference.error}</p> : null}
        {recorder.error ? <ErrorState message={recorder.error} /> : null}
        {status === PracticeStatus.Error && error ? (
          <ErrorState
            title={copy.practice.errorTitle}
            message={error}
            onRetry={() => void begin()}
          />
        ) : null}
      </section>

      <footer className="practice-session__recorder" aria-live="polite">
        <IconButton
          icon={IconName.Play}
          label={reference.isPlaying ? copy.practice.playing : copy.practice.listen}
          className="practice-session__side"
          disabled={reference.isPlaying}
          onClick={() => reference.play(item.text)}
        />
        <span
          className={cx('practice-session__ring', isRecording && 'is-recording')}
          style={{
            background: `conic-gradient(var(--color-success) ${String(level)}%, var(--color-border) 0)`,
          }}
        >
          <button
            type="button"
            className={cx('practice-session__record', isRecording && 'is-recording')}
            onClick={() => void (isRecording ? finish() : begin())}
            disabled={isScoring}
            aria-label={
              isRecording
                ? `${copy.practice.stop} (${String(recorder.seconds)}s)`
                : copy.practice.record
            }
          >
            <Icon name={isRecording ? IconName.Stop : IconName.Record} />
          </button>
        </span>
        <span
          className="visually-hidden"
          role="meter"
          aria-label={copy.practice.levelAria}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={level}
        />
        {result && !isResultOpen ? (
          <IconButton
            icon={IconName.Info}
            label={copy.practice.openResult}
            className="practice-session__side"
            onClick={() => setIsResultOpen(true)}
          />
        ) : (
          <span
            className="practice-session__side practice-session__side--empty"
            aria-hidden="true"
          />
        )}
        <p className="practice-session__status">
          {isRecording
            ? `${copy.practice.recording} · ${String(recorder.seconds)}s`
            : isScoring
              ? copy.practice.scoring
              : result
                ? copy.practice.openResult
                : copy.practice.record}
        </p>
        {isScoring ? <Skeleton lines={1} label={copy.practice.scoring} /> : null}
        {extraActions && !isResultOpen ? (
          <div className="practice-session__extra">{extraActions}</div>
        ) : null}
      </footer>

      <Sheet
        isOpen={isResultOpen && result !== null}
        title={copy.practice.resultTitle}
        onClose={() => setIsResultOpen(false)}
      >
        {result ? (
          <ResultCard
            result={result}
            recording={recording}
            outlineAt={outlineAt}
            onRetry={() => void begin()}
            extraActions={extraActions}
            isBare
          />
        ) : null}
      </Sheet>
    </div>
  );
};
