'use client';

import Link from 'next/link';
import { type ReactElement, type ReactNode, useCallback, useState } from 'react';

import { Button } from '@/components/Button/Button';
import { ConfidenceBadge } from '@/components/ConfidenceBadge/ConfidenceBadge';
import { ErrorState } from '@/components/ErrorState/ErrorState';
import { PageIntro } from '@/components/PageIntro/PageIntro';
import { Skeleton } from '@/components/Skeleton/Skeleton';
import { COPY } from '@/constants/copy.constant';
import { ButtonVariant } from '@/enums/button-variant.enum';
import { PracticeStatus } from '@/enums/practice-status.enum';
import { RecorderStatus } from '@/enums/recorder-status.enum';
import { StorageKey } from '@/enums/storage-key.enum';
import { CameraPanel } from '@/features/mirror/components/CameraPanel';
import { TargetShape } from '@/features/mirror/components/TargetShape';
import { useCalibration } from '@/features/mirror/hooks/useCalibration';
import { useMouthTracker } from '@/features/mirror/hooks/useMouthTracker';
import { ResultCard } from '@/features/practice/components/ResultCard';
import { useRecorder } from '@/features/practice/hooks/useRecorder';
import { useReferenceAudio } from '@/features/practice/hooks/useReferenceAudio';
import { assess } from '@/features/practice/services/assessment.service';
import { MouthTutorButton } from '@/features/tutor/components/MouthTutorButton';
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
  /** Viseme target of the drill's sound, shown next to the camera. */
  targetGroup?: VisemeTargetCard | null;
  targetIpa?: string;
  transitionVi?: string | null;
  onResult?: (result: AssessmentResponse) => void;
  /** Drill navigation (next / skip) rendered under the recorder. */
  extraActions?: ReactNode;
}

export const PracticeSession = ({
  item,
  targetGroup = null,
  targetIpa,
  transitionVi = null,
  onResult,
  extraActions,
}: PracticeSessionProps): ReactElement => {
  const [status, setStatus] = useState(PracticeStatus.Idle);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AssessmentResponse | null>(null);
  const [recording, setRecording] = useState<Recording | null>(null);
  const [cameraOn, setCameraOn] = useStoredState<boolean>(StorageKey.CameraDefault, false);
  const recorder = useRecorder();
  const reference = useReferenceAudio();
  const calibration = useCalibration();
  const tracker = useMouthTracker({ enabled: cameraOn, calibration: calibration.value });

  const begin = useCallback(async () => {
    setResult(null);
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
  const kindLabel = COPY.practice.kind[item.kind];

  return (
    <div className="practice-session">
      <PageIntro title={item.title} lead={kindLabel}>
        <Link href="/practice" className="button button--ghost">
          {COPY.practice.back}
        </Link>
      </PageIntro>

      <section className="practice-session__prompt" aria-label="Bài luyện">
        <p className="practice-session__text">{item.text}</p>
        <div className="practice-session__actions">
          <Button
            variant={ButtonVariant.Secondary}
            onClick={() => reference.play(item.text)}
            disabled={reference.isPlaying}
          >
            {reference.isPlaying ? COPY.practice.playing : COPY.practice.listen}
          </Button>
          <Button
            variant={ButtonVariant.Ghost}
            onClick={() => setCameraOn(!cameraOn)}
            aria-pressed={cameraOn}
          >
            {cameraOn ? COPY.practice.cameraOff : COPY.practice.cameraOn}
          </Button>
        </div>
        {reference.error ? <p className="practice-session__error">{reference.error}</p> : null}
        <p className="practice-session__muted">{COPY.practice.cameraHint}</p>
      </section>

      {cameraOn ? (
        <div className="practice-session__camera">
          <CameraPanel tracker={tracker} compact />
          {targetGroup ? (
            <aside className="practice-session__target" aria-label={COPY.practice.drill.targetHint}>
              <TargetShape group={targetGroup.group} size={96} />
              <div className="practice-session__target-copy">
                <p className="practice-session__target-name">
                  {targetIpa ? `/${targetIpa}/ · ` : ''}
                  {targetGroup.name_vi}
                </p>
                <ConfidenceBadge confidence={targetGroup.confidence} />
                <p className="practice-session__muted">{targetGroup.hint_vi}</p>
                {transitionVi ? <p className="practice-session__muted">{transitionVi}</p> : null}
                <MouthTutorButton
                  tracker={tracker}
                  soundIpa={targetIpa ?? item.focus[0] ?? ''}
                  targetVi={targetGroup.hint_vi}
                />
              </div>
            </aside>
          ) : null}
        </div>
      ) : null}

      <section className="practice-session__recorder" aria-live="polite">
        <Button
          className={cx('practice-session__record', isRecording && 'is-recording')}
          onClick={() => void (isRecording ? finish() : begin())}
          disabled={status === PracticeStatus.Scoring}
        >
          {isRecording
            ? `${COPY.practice.stop} (${String(recorder.seconds)}s)`
            : COPY.practice.record}
        </Button>
        <span
          className="practice-session__level"
          role="meter"
          aria-label="Mức âm"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(Math.min(1, recorder.level * 4) * 100)}
        >
          <span
            className="practice-session__level-fill"
            style={{ inlineSize: `${String(Math.round(Math.min(1, recorder.level * 4) * 100))}%` }}
          />
        </span>
        {isRecording ? <p className="practice-session__muted">{COPY.practice.recording}</p> : null}
        {recorder.error ? <ErrorState message={recorder.error} /> : null}
        {extraActions ? <div className="practice-session__extra">{extraActions}</div> : null}
      </section>

      {status === PracticeStatus.Scoring ? (
        <Skeleton lines={4} label={COPY.practice.scoring} />
      ) : null}
      {status === PracticeStatus.Error && error ? (
        <ErrorState title={COPY.practice.errorTitle} message={error} onRetry={() => void begin()} />
      ) : null}
      {result ? (
        <ResultCard
          result={result}
          recording={recording}
          outlineAt={outlineAt}
          onRetry={() => void begin()}
        />
      ) : null}
    </div>
  );
};
