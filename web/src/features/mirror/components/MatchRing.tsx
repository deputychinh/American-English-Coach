'use client';

import type { ReactElement } from 'react';

import { MatchState } from '@/enums/match-state.enum';
import { useCopy } from '@/hooks/useCopy';
import { cx } from '@/utils/cx.util';

import './MatchRing.css';

interface MatchRingProps {
  /** 0..1 overall match. */
  score: number;
  state: MatchState;
  isHeld: boolean;
  /** 0..1 share of the hold time already on target. */
  holdProgress: number;
}

const CIRCUMFERENCE = 2 * Math.PI * 26;

/** Live "how close am I" dial: the arc is the score, the inner arc fills while holding on target. */
export const MatchRing = ({ score, state, isHeld, holdProgress }: MatchRingProps): ReactElement => {
  const copy = useCopy();
  const percent = Math.round(Math.min(1, Math.max(0, score)) * 100);
  const label = isHeld
    ? copy.mirror.match.held
    : state === MatchState.OnTarget
      ? copy.mirror.match.onTarget
      : state === MatchState.Close
        ? copy.mirror.match.close
        : state === MatchState.Far
          ? copy.mirror.match.far
          : copy.mirror.match.noFace;
  return (
    <div
      className={cx('match-ring', `match-ring--${state}`, isHeld && 'is-held')}
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      aria-valuetext={`${String(percent)} % · ${label}`}
      aria-label={copy.mirror.match.scoreAria(percent)}
    >
      <svg className="match-ring__svg" viewBox="0 0 64 64" aria-hidden="true">
        <circle className="match-ring__track" cx="32" cy="32" r="26" />
        <circle
          className="match-ring__value"
          cx="32"
          cy="32"
          r="26"
          style={{
            strokeDasharray: CIRCUMFERENCE,
            strokeDashoffset: CIRCUMFERENCE * (1 - percent / 100),
          }}
        />
        {state === MatchState.OnTarget || isHeld ? (
          <circle
            className="match-ring__hold"
            cx="32"
            cy="32"
            r="20"
            style={{
              strokeDasharray: 2 * Math.PI * 20,
              strokeDashoffset: 2 * Math.PI * 20 * (1 - (isHeld ? 1 : holdProgress)),
            }}
          />
        ) : null}
      </svg>
      <span className="match-ring__percent">{isHeld ? '✓' : `${String(percent)}%`}</span>
      <span className="match-ring__label">{label}</span>
    </div>
  );
};
