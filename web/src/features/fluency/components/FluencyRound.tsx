'use client';

import type { ReactElement } from 'react';

import { Button } from '@/components/Button/Button';
import { Icon } from '@/components/Icon/Icon';
import { ButtonVariant } from '@/enums/button-variant.enum';
import { IconName } from '@/enums/icon-name.enum';
import { TakePhase } from '@/enums/take-phase.enum';
import { FluencyTable } from '@/features/fluency/components/FluencyTable';
import { useFluencyTake } from '@/features/fluency/hooks/useFluencyTake';
import { useCopy } from '@/hooks/useCopy';
import type { FluencyMetrics } from '@/interfaces/fluency.interface';
import { cx } from '@/utils/cx.util';

import './FluencyRound.css';

interface FluencyRoundProps {
  index: number;
  total: number;
  seconds: number;
  /** Seconds of the next round, or null after the last one. */
  nextSeconds: number | null;
  isHidden: boolean;
  onDone: (metrics: FluencyMetrics) => void;
}

/** One timed round: start, speak until the time runs out, see this round's numbers, go on. */
export const FluencyRound = ({
  index,
  total,
  seconds,
  nextSeconds,
  isHidden,
  onDone,
}: FluencyRoundProps): ReactElement => {
  const copy = useCopy().fluency;
  const take = useFluencyTake(seconds);
  const { metrics } = take;

  return (
    <section className="fluency-round" aria-labelledby="fluency-round-title">
      <h2 id="fluency-round-title" className="fluency-round__title">
        {copy.round(index, total)}
      </h2>
      {take.phase === TakePhase.Idle ? (
        <button type="button" className="fluency-round__mic" onClick={take.start}>
          <Icon name={IconName.Practice} />
          <span>{copy.start(index, seconds)}</span>
        </button>
      ) : null}
      {take.phase === TakePhase.Recording ? (
        <>
          <p className="fluency-round__clock" role="timer" aria-live="off">
            {copy.secondsLeft(take.secondsLeft)}
          </p>
          <div className="fluency-round__level" aria-hidden="true">
            <span
              className="fluency-round__level-fill"
              style={{ inlineSize: `${String(Math.min(100, Math.round(take.level * 400)))}%` }}
            />
          </div>
          <p className="fluency-round__hint">{copy.speakNow}</p>
          <button
            type="button"
            className={cx('fluency-round__mic', take.isRecording && 'is-recording')}
            onClick={take.finish}
          >
            <Icon name={IconName.Stop} />
            <span>{copy.finish}</span>
          </button>
        </>
      ) : null}
      {take.phase === TakePhase.Scoring ? (
        <p className="fluency-round__hint" role="status">
          {copy.analyzing}
        </p>
      ) : null}
      {take.phase === TakePhase.Failed ? (
        <>
          <p className="fluency-round__error" role="alert">
            {copy.noSpeech}
          </p>
          <Button variant={ButtonVariant.Secondary} onClick={take.reset}>
            {copy.retry}
          </Button>
        </>
      ) : null}
      {take.phase === TakePhase.Scored && metrics ? (
        <>
          <p className="fluency-round__done" role="status">
            {copy.roundDone(index)}
          </p>
          {isHidden ? null : <FluencyTable rounds={[{ targetSeconds: seconds, metrics }]} />}
          <Button isFullWidth onClick={() => onDone(metrics)}>
            {nextSeconds === null ? copy.showSummary : copy.next(index + 1, nextSeconds)}
          </Button>
        </>
      ) : null}
      {take.recorderError ? (
        <p className="fluency-round__error" role="alert">
          {take.recorderError}
        </p>
      ) : null}
    </section>
  );
};
