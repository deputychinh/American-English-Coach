'use client';

import { type ReactElement, type ReactNode, useCallback, useEffect, useRef, useState } from 'react';

import { Icon } from '@/components/Icon/Icon';
import { IconButton } from '@/components/IconButton/IconButton';
import { MASTERY_STREAK, MAX_SILENT_ATTEMPTS, REPEAT_DELAY_MS } from '@/constants/mirror.constant';
import { SILENCE_MS_WORD } from '@/constants/recorder.constant';
import { IconName } from '@/enums/icon-name.enum';
import { RecorderStatus } from '@/enums/recorder-status.enum';
import { SpeakStatus } from '@/features/mirror/components/SpeakStatus';
import { useRecorder } from '@/features/practice/hooks/useRecorder';
import { useReferenceAudio } from '@/features/practice/hooks/useReferenceAudio';
import { assess } from '@/features/practice/services/assessment.service';
import { useCopy } from '@/hooks/useCopy';
import { useSwipe } from '@/hooks/useSwipe';
import type { SpeakOutcome, SpeakPhase } from '@/interfaces/mouth-match.interface';
import type { TargetMap } from '@/interfaces/mouth.interface';
import type { MouthTracker } from '@/interfaces/tracker.interface';
import type { AutoStopReason } from '@/interfaces/vad.interface';
import { cx } from '@/utils/cx.util';
import { targetVerdict } from '@/utils/drill.util';
import { mouthHitRate, speakOutcome } from '@/utils/mouth-match.util';
import { nativeHaptic } from '@/utils/native.util';

import './SpeakCheck.css';

interface SpeakCheckProps {
  tracker: MouthTracker;
  targets: TargetMap;
  /** Drill id of the sound (for the stored item id) and its example words. */
  drillId: string;
  words: string[];
  /** ARPAbet symbol of the target phone and its IPA. */
  symbol: string;
  ipa: string;
  /** Live mouth feedback (cue and match dial) shown while idle. */
  live?: ReactNode;
}

/**
 * The mirror's control deck: the word, one status line and three controls. Recording ends by
 * itself when the learner stops talking; with auto repeat the next attempt starts on its own
 * until the sound is mastered, so the learner can keep saying the word with their face in view.
 */
export const SpeakCheck = ({
  tracker,
  targets,
  drillId,
  words,
  symbol,
  ipa,
  live = null,
}: SpeakCheckProps): ReactElement => {
  const copy = useCopy();
  const reference = useReferenceAudio();
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<SpeakPhase>('idle');
  const [outcome, setOutcome] = useState<SpeakOutcome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const [lastUrl, setLastUrl] = useState<string | null>(null);
  const [isRepeat, setIsRepeat] = useState(true);
  const [isQueued, setIsQueued] = useState(false);
  const silentRef = useRef(0);
  const finishingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoStopRef = useRef<(reason: AutoStopReason) => void>(() => undefined);
  const recorder = useRecorder({
    onAutoStop: (reason) => autoStopRef.current(reason),
    silenceMs: SILENCE_MS_WORD,
  });
  const word = words[index % Math.max(1, words.length)] ?? '';
  const isMastered = streak >= MASTERY_STREAK;
  const canJudgeMouth = Object.keys(targets).length > 0;

  const clearTimer = (): void => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    setIsQueued(false);
  };

  const start = useCallback(async () => {
    clearTimer();
    setError(null);
    setPhase('listening');
    await recorder.start();
  }, [recorder]);

  const scheduleNext = useCallback(() => {
    clearTimer();
    setIsQueued(true);
    timerRef.current = setTimeout(() => void start(), REPEAT_DELAY_MS);
  }, [start]);

  const finish = useCallback(async () => {
    // A tap on the mic can land in the same instant the take ends by itself: score it once.
    if (finishingRef.current) return;
    finishingRef.current = true;
    const captured = await recorder.stop().finally(() => {
      finishingRef.current = false;
    });
    if (!captured) return;
    setLastUrl(captured.url);
    setPhase('scoring');
    const frames = tracker
      .framesBetween(captured.startedAt, captured.startedAt + captured.durationSeconds)
      .map(({ t, features, quality }) => ({ t, features, quality }));
    try {
      const result = await assess({
        item: {
          id: `sound:${drillId}:mirror:${word}`,
          text: word,
          kind: 'word',
          title: `/${ipa}/ · ${word}`,
          focus: [symbol],
        },
        audio: captured.blob,
        mouthFrames: frames,
        audioStartedAt: frames.length > 0 ? captured.startedAt : null,
      });
      const next = speakOutcome({
        sound: targetVerdict(result, symbol),
        mouthRate: mouthHitRate(frames, targets),
        canJudgeMouth,
      });
      const nextStreak = next.isPass ? streak + 1 : 0;
      silentRef.current = 0;
      setOutcome(next);
      setStreak(nextStreak);
      setPhase('result');
      void nativeHaptic(next.isPass ? 'success' : 'warning');
      if (isRepeat && nextStreak < MASTERY_STREAK) scheduleNext();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setPhase('result');
    }
  }, [
    canJudgeMouth,
    drillId,
    ipa,
    isRepeat,
    recorder,
    scheduleNext,
    streak,
    symbol,
    targets,
    tracker,
    word,
  ]);

  useEffect(() => {
    autoStopRef.current = (reason) => {
      if (reason === 'end') {
        void finish();
        return;
      }
      void recorder.stop();
      silentRef.current += 1;
      setPhase('silent');
      if (isRepeat && silentRef.current < MAX_SILENT_ATTEMPTS) scheduleNext();
    };
  }, [finish, isRepeat, recorder, scheduleNext]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const isRecording = recorder.status === RecorderStatus.Recording;
  const step = (delta: number): void => {
    clearTimer();
    if (isRecording) void recorder.stop();
    setIndex((value) => (value + delta + words.length) % Math.max(1, words.length));
    setOutcome(null);
    setError(null);
    setLastUrl(null);
    setPhase('idle');
  };
  const onMic = (): void => {
    if (phase === 'scoring' || finishingRef.current) return;
    if (isRecording) {
      void finish();
      return;
    }
    silentRef.current = 0;
    void start();
  };
  const toggleRepeat = (): void => {
    if (isRepeat) clearTimer();
    setIsRepeat(!isRepeat);
  };

  const level = Math.min(1, recorder.level * 6);
  // Swipe the word like a flash card; ignored while a take is recording or being scored.
  const swipe = useSwipe({
    onLeft: () => step(1),
    onRight: () => step(-1),
    isEnabled: words.length > 1 && !isRecording && phase !== 'scoring',
  });

  return (
    <section className="speak-check" aria-label={copy.speak.say}>
      <div className="speak-check__word-row" {...swipe}>
        <IconButton
          icon={IconName.ChevronLeft}
          label={copy.speak.prev}
          className="speak-check__nav"
          disabled={phase === 'scoring' || words.length < 2}
          onClick={() => step(-1)}
        />
        <div className="speak-check__word-box">
          <p className="speak-check__word" aria-label={`${copy.speak.say}: ${word}`}>
            {word}
          </p>
          <p
            className="speak-check__streak"
            role="img"
            aria-label={copy.speak.streak(Math.min(streak, MASTERY_STREAK), MASTERY_STREAK)}
          >
            {Array.from({ length: MASTERY_STREAK }, (_, dot) => (
              <span key={dot} className={cx('speak-check__dot', dot < streak && 'is-on')} />
            ))}
          </p>
        </div>
        <IconButton
          icon={IconName.ChevronRight}
          label={copy.speak.next}
          className="speak-check__nav"
          disabled={phase === 'scoring' || words.length < 2}
          onClick={() => step(1)}
        />
      </div>

      <div className="speak-check__status" role="status" aria-live="polite">
        <SpeakStatus
          phase={phase}
          outcome={outcome}
          error={error}
          ipa={ipa}
          drillId={drillId}
          isMastered={isMastered}
          canJudgeMouth={canJudgeMouth}
          hasSpeech={recorder.hasSpeech}
          live={live}
        />
        {phase === 'result' && isQueued ? (
          <p className="speak-check__next">{copy.speak.nextAttempt}</p>
        ) : null}
      </div>

      <div className="speak-check__controls">
        <button
          type="button"
          className="speak-check__side"
          aria-label={copy.speak.listen}
          disabled={reference.isPlaying || isRecording}
          onClick={() => reference.play(word)}
        >
          <span className="speak-check__side-icon" aria-hidden="true">
            <Icon name={IconName.Play} />
          </span>
          {copy.speak.model}
        </button>
        <button
          type="button"
          className={cx('speak-check__mic', isRecording && 'is-recording')}
          disabled={phase === 'scoring' || word === ''}
          aria-label={
            phase === 'scoring'
              ? copy.speak.scoring
              : isRecording
                ? copy.speak.stop
                : copy.speak.record
          }
          onClick={onMic}
        >
          <span
            className="speak-check__mic-ring"
            aria-hidden="true"
            style={{ transform: `scale(${String(1 + (isRecording ? level * 0.35 : 0))})` }}
          />
          <Icon name={isRecording ? IconName.Stop : IconName.Practice} />
        </button>
        <button
          type="button"
          className="speak-check__side"
          aria-label={copy.speak.replay}
          disabled={!lastUrl || isRecording}
          onClick={() => {
            if (lastUrl) void new Audio(lastUrl).play();
          }}
        >
          <span className="speak-check__side-icon" aria-hidden="true">
            <Icon name={IconName.Replay} />
          </span>
          {copy.speak.mine}
        </button>
      </div>

      <button
        type="button"
        className={cx('speak-check__repeat', isRepeat && 'is-on')}
        aria-pressed={isRepeat}
        onClick={toggleRepeat}
      >
        {isRepeat ? copy.speak.repeatOn : copy.speak.repeatOff}
      </button>
      {recorder.error || reference.error ? (
        <p className="speak-check__line">{recorder.error ?? reference.error}</p>
      ) : null}
    </section>
  );
};
