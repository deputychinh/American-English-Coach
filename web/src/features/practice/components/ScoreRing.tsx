'use client';

import type { ReactElement } from 'react';

import { useCopy } from '@/hooks/useCopy';
import { cx } from '@/utils/cx.util';

import './ScoreRing.css';

interface ScoreRingProps {
  ok: number;
  total: number;
}

const CIRCUMFERENCE = 2 * Math.PI * 30;

/** Share of phones on target as a dial: the number learners compare between attempts. */
export const ScoreRing = ({ ok, total }: ScoreRingProps): ReactElement => {
  const copy = useCopy();
  const percent = total > 0 ? Math.round((ok / total) * 100) : 0;
  const tone = percent >= 80 ? 'good' : percent >= 50 ? 'fair' : 'low';
  return (
    <div
      className={cx('score-ring', `score-ring--${tone}`)}
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      aria-label={copy.practice.scoreAria(percent)}
    >
      <svg className="score-ring__svg" viewBox="0 0 72 72" aria-hidden="true">
        <circle className="score-ring__track" cx="36" cy="36" r="30" />
        <circle
          className="score-ring__value"
          cx="36"
          cy="36"
          r="30"
          style={{
            strokeDasharray: CIRCUMFERENCE,
            strokeDashoffset: CIRCUMFERENCE * (1 - percent / 100),
          }}
        />
      </svg>
      <span className="score-ring__percent">{percent}%</span>
      <span className="score-ring__label">{copy.practice.scoreLabel(ok, total)}</span>
    </div>
  );
};
