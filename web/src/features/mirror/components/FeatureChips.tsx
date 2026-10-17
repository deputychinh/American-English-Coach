'use client';

import type { ReactElement } from 'react';

import { useCopy } from '@/hooks/useCopy';
import type { FeatureVerdict } from '@/interfaces/mouth-match.interface';
import type { MouthFeatureName } from '@/interfaces/mouth.interface';
import { cx } from '@/utils/cx.util';

import './FeatureChips.css';

interface FeatureChipsProps {
  names: MouthFeatureName[];
  verdicts: FeatureVerdict[];
  labels: Record<MouthFeatureName, string>;
  /** No usable face yet: every chip is neutral. */
  isIdle: boolean;
}

/** One chip per target feature: teal inside the range, amber with an arrow when it needs to move. */
export const FeatureChips = ({
  names,
  verdicts,
  labels,
  isIdle,
}: FeatureChipsProps): ReactElement => {
  const copy = useCopy();
  const byName = new Map(verdicts.map((verdict) => [verdict.name, verdict]));
  return (
    <ul className="feature-chips" aria-label={copy.mirror.details}>
      {names.map((name) => {
        const verdict = isIdle ? null : byName.get(name);
        const direction = verdict?.direction ?? 'idle';
        return (
          <li key={name} className={cx('feature-chips__chip', `feature-chips__chip--${direction}`)}>
            <span className="feature-chips__dot" aria-hidden="true" />
            <span>{labels[name]}</span>
            {direction === 'low' || direction === 'high' ? (
              <span className="feature-chips__arrow" aria-hidden="true">
                {direction === 'low' ? '↑' : '↓'}
              </span>
            ) : null}
            <span className="visually-hidden">
              {direction === 'inside'
                ? copy.mirror.insideTarget
                : direction === 'low'
                  ? copy.mirror.cues[name].increase
                  : direction === 'high'
                    ? copy.mirror.cues[name].decrease
                    : copy.mirror.noMouth}
            </span>
          </li>
        );
      })}
    </ul>
  );
};
