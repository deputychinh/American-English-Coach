'use client';

import { type ReactElement, type ReactNode, useCallback, useEffect, useRef, useState } from 'react';

import { ErrorState } from '@/components/ErrorState/ErrorState';
import { Icon } from '@/components/Icon/Icon';
import { IconButton } from '@/components/IconButton/IconButton';
import { LessonHeader } from '@/components/LessonHeader/LessonHeader';
import { Sheet } from '@/components/Sheet/Sheet';
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
import { useFocusMode, useImmersive } from '@/hooks/useImmersive';
import { useKeepAwake } from '@/hooks/useKeepAwake';
import { useStoredState } from '@/hooks/useStoredState';
import type { Point2 } from '@/interfaces/mouth.interface';
import type {
  AssessmentResponse,
  PracticeItem,
  Recording,
  VisemeTargetCard,
} from '@/interfaces/practice.interface';
import type { AutoStopReason } from '@/interfaces/vad.interface';
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
  /** 0..1 position in a drill, drawn as the lesson progress bar. */
  progress?: number;
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
  progress,
}: PracticeSessionProps): ReactElement => {
  const copy = useCopy();
  const [status, setStatus] = useState(PracticeStatus.Idle);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AssessmentResponse | null>(null);
  const [isResultOpen, setIsResultOpen] = useState(false);
  const [recording, setRecording] = useState<Recording | null>(null);
  const [cameraOn, setCameraOn] = useStoredState<boolean>(StorageKey.CameraDefault, false);
  const [isSilent, setIsSilent] = useState(false);
  const autoStopRef = useRef<(reason: AutoStopReason) => void>(() => undefined);
  const recorder = useRecorder({ onAutoStop: (reason) => autoStopRef.current(reason) });
  useKeepAwake();
  useImmersive();
  useFocusMode();
  const reference = useReferenceAudio();
  const calibration = useCalibration();
  const tracker = useMouthTracker({ enabled: cameraOn, calibration: calibration.value });

  const begin = useCallback(async () => {
    setResult(null);
    setIsResultOpen(false);
    setError(null);
    setIsSilent(false);
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

  useEffect(() => {
    autoStopRef.current = (reason) => {
      if (reason === 'end') {
        void finish();
        return;
      }
      void recorder.stop();
      setIsSilent(true);
      setStatus(PracticeStatus.Idle);
    };
  }, [finish, recorder]);

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
      <LessonHeader
        closeHref="/practice"
        title={item.title}
        subtitle={`${kindLabel}${targetIpa ? ` · ${copy.practice.targetLabel} /${targetIpa}/` : ''}`}
        progress={progress}
        trailing={
          <IconButton
            icon={IconName.Camera}
            label={cameraOn ? copy.practice.cameraOff : copy.practice.cameraOn}
            aria-pressed={cameraOn}
            className={cx('practice-session__toggle', cameraOn && 'is-on')}
            onClick={() => setCameraOn(!cameraOn)}
          />
        }
      />
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

      <footer className="practice-session__recorder">
        <div className="practice-session__status" aria-live="polite">
          {isRecording ? (
            <p className="practice-session__line">
              <span className="practice-session__live-dot" aria-hidden="true" />
              {recorder.hasSpeech ? copy.speak.hearing : copy.speak.listening}
            </p>
          ) : isScoring ? (
            <p className="practice-session__line">{copy.practice.scoring}</p>
          ) : isSilent ? (
            <p className="practice-session__line">{copy.speak.noSpeech}</p>
          ) : result && !isResultOpen ? (
            <button
              type="button"
              className="practice-session__open"
              onClick={() => setIsResultOpen(true)}
            >
              {copy.practice.openResult}
            </button>
          ) : (
            <p className="practice-session__line">{copy.speak.idleHint}</p>
          )}
        </div>
        <div className="practice-session__controls">
          <button
            type="button"
            className="practice-session__side"
            aria-label={copy.practice.listen}
            disabled={reference.isPlaying || isRecording}
            onClick={() => reference.play(item.text)}
          >
            <span className="practice-session__side-icon" aria-hidden="true">
              <Icon name={IconName.Play} />
            </span>
            {reference.isPlaying ? copy.practice.playing : copy.speak.model}
          </button>
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
            <span
              className="practice-session__ring"
              aria-hidden="true"
              style={{ transform: `scale(${String(1 + (isRecording ? level / 300 : 0))})` }}
            />
            <Icon name={isRecording ? IconName.Stop : IconName.Practice} />
          </button>
          <button
            type="button"
            className="practice-session__side"
            aria-label={copy.speak.replay}
            disabled={!recording || isRecording}
            onClick={() => {
              if (recording) void new Audio(recording.url).play();
            }}
          >
            <span className="practice-session__side-icon" aria-hidden="true">
              <Icon name={IconName.Replay} />
            </span>
            {copy.speak.mine}
          </button>
        </div>
        <span
          className="visually-hidden"
          role="meter"
          aria-label={copy.practice.levelAria}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={level}
        />
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
