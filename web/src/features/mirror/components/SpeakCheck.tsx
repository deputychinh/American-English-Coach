'use client';

import Link from 'next/link';
import { type ReactElement, useCallback, useState } from 'react';

import { Icon } from '@/components/Icon/Icon';
import { IconButton } from '@/components/IconButton/IconButton';
import { MASTERY_STREAK } from '@/constants/mirror.constant';
import { IconName } from '@/enums/icon-name.enum';
import { RecorderStatus } from '@/enums/recorder-status.enum';
import { useRecorder } from '@/features/practice/hooks/useRecorder';
import { useReferenceAudio } from '@/features/practice/hooks/useReferenceAudio';
import { assess } from '@/features/practice/services/assessment.service';
import { useCopy } from '@/hooks/useCopy';
import type { SpeakOutcome } from '@/interfaces/mouth-match.interface';
import type { TargetMap } from '@/interfaces/mouth.interface';
import type { MouthTracker } from '@/interfaces/tracker.interface';
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
}

/** "Say it in the mirror": the sound and the mouth shape are scored together on one attempt. */
export const SpeakCheck = ({
  tracker,
  targets,
  drillId,
  words,
  symbol,
  ipa,
}: SpeakCheckProps): ReactElement => {
  const copy = useCopy();
  const recorder = useRecorder();
  const reference = useReferenceAudio();
  const [index, setIndex] = useState(0);
  const [isScoring, setIsScoring] = useState(false);
  const [outcome, setOutcome] = useState<SpeakOutcome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const [lastUrl, setLastUrl] = useState<string | null>(null);
  const word = words[index % Math.max(1, words.length)] ?? '';
  const isRecording = recorder.status === RecorderStatus.Recording;
  const isMastered = streak >= MASTERY_STREAK;

  const start = useCallback(async () => {
    setOutcome(null);
    setError(null);
    await recorder.start();
  }, [recorder]);

  const stop = useCallback(async () => {
    const captured = await recorder.stop();
    if (!captured) return;
    setLastUrl(captured.url);
    setIsScoring(true);
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
        canJudgeMouth: Object.keys(targets).length > 0,
      });
      setOutcome(next);
      setStreak((count) => (next.isPass ? count + 1 : 0));
      void nativeHaptic(next.isPass ? 'success' : 'warning');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setIsScoring(false);
    }
  }, [drillId, ipa, recorder, symbol, targets, tracker, word]);

  const step = (delta: number): void => {
    setIndex((value) => (value + delta + words.length) % Math.max(1, words.length));
    setOutcome(null);
    setError(null);
    setLastUrl(null);
  };

  const soundLabel = outcome?.sound ? copy.speak.verdict[outcome.sound] : copy.speak.verdict.none;
  const canJudgeMouth = Object.keys(targets).length > 0;
  const mouthLabel = !canJudgeMouth
    ? copy.speak.mouthNotNeeded
    : outcome?.mouthRate === null || outcome?.mouthRate === undefined
      ? copy.speak.mouthNone
      : outcome.kind === 'both' || outcome.kind === 'mouth'
        ? copy.speak.mouthOk
        : copy.speak.mouthOff;

  return (
    <div className="speak-check">
      {outcome || error ? (
        <div
          className={cx('speak-check__result', outcome && `speak-check__result--${outcome.kind}`)}
          role="status"
          aria-live="polite"
        >
          {error ? (
            <p className="speak-check__headline">{error}</p>
          ) : outcome ? (
            <>
              <p className="speak-check__headline">
                {isMastered ? copy.speak.mastered : copy.speak.headline[outcome.kind]}
              </p>
              <p className="speak-check__lines">
                <span className={cx('speak-check__pill', outcome.sound === 'ok' && 'is-ok')}>
                  {copy.speak.sound(ipa)}: {soundLabel}
                </span>
                <span
                  className={cx(
                    'speak-check__pill',
                    (outcome.kind === 'both' || outcome.kind === 'mouth') && 'is-ok',
                  )}
                >
                  {copy.speak.mouth}: {mouthLabel}
                </span>
              </p>
              <p className="speak-check__streak">
                <span className="speak-check__dots" aria-hidden="true">
                  {Array.from({ length: MASTERY_STREAK }, (_, dot) => (
                    <span key={dot} className={cx('speak-check__dot', dot < streak && 'is-on')} />
                  ))}
                </span>
                {copy.speak.streak(Math.min(streak, MASTERY_STREAK), MASTERY_STREAK)}
              </p>
              {isMastered ? (
                <Link
                  href={{ pathname: '/practice', query: { sound: drillId } }}
                  className="speak-check__link"
                >
                  {copy.speak.practiceSentences}
                </Link>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}
      <p className="speak-check__word" aria-label={`${copy.speak.say}: ${word}`}>
        {word}
      </p>
      <div className="speak-check__row">
        <IconButton
          icon={IconName.ChevronLeft}
          label={copy.speak.prev}
          className="speak-check__nav"
          disabled={isRecording || isScoring || words.length < 2}
          onClick={() => step(-1)}
        />
        <IconButton
          icon={IconName.Play}
          label={copy.speak.listen}
          className="speak-check__side"
          disabled={reference.isPlaying || isRecording}
          onClick={() => reference.play(word)}
        />
        <button
          type="button"
          className={cx('speak-check__mic', isRecording && 'is-recording')}
          disabled={isScoring || word === ''}
          aria-label={
            isScoring ? copy.speak.scoring : isRecording ? copy.speak.stop : copy.speak.record
          }
          onClick={() => void (isRecording ? stop() : start())}
        >
          <Icon name={isRecording ? IconName.Stop : IconName.Practice} />
        </button>
        <IconButton
          icon={IconName.Volume}
          label={copy.speak.replay}
          className="speak-check__side"
          disabled={!lastUrl || isRecording}
          onClick={() => {
            if (lastUrl) void new Audio(lastUrl).play();
          }}
        />
        <IconButton
          icon={IconName.ChevronRight}
          label={copy.speak.next}
          className="speak-check__nav"
          disabled={isRecording || isScoring || words.length < 2}
          onClick={() => step(1)}
        />
      </div>
      {recorder.error ? <p className="speak-check__error">{recorder.error}</p> : null}
    </div>
  );
};
