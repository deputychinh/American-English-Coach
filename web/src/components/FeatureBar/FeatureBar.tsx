import type { ReactElement } from 'react';

import type { TargetRange } from '@/interfaces/mouth.interface';
import { cx } from '@/utils/cx.util';

import './FeatureBar.css';

interface FeatureBarProps {
  label: string;
  value: number;
  target?: TargetRange;
}

const percent = (value: number): string => `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%`;

/** A 0..1 meter with the target band drawn behind the value. */
export const FeatureBar = ({ label, value, target }: FeatureBarProps): ReactElement => {
  const low = target?.min ?? 0;
  const high = target?.max ?? 1;
  const isInside = value >= low && value <= high;
  return (
    <div className="feature-bar">
      <div className="feature-bar__head">
        <span className="feature-bar__label">{label}</span>
        <span className="feature-bar__value">{percent(value)}</span>
      </div>
      <div
        className="feature-bar__track"
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(value * 100)}
        aria-valuetext={`${percent(value)}${isInside ? ', trong vùng mục tiêu' : ''}`}
      >
        {target ? (
          <span
            className="feature-bar__target"
            style={{ insetInlineStart: percent(low), inlineSize: percent(high - low) }}
          />
        ) : null}
        <span
          className={cx('feature-bar__fill', target && isInside && 'is-inside')}
          style={{ inlineSize: percent(value) }}
        />
      </div>
    </div>
  );
};
