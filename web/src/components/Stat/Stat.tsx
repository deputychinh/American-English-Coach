import type { ReactElement } from 'react';

import { cx } from '@/utils/cx.util';

import './Stat.css';

interface StatProps {
  label: string;
  value: string;
  hint?: string;
  tone?: 'neutral' | 'success' | 'warning';
}

/** Compact number tile for dashboards. */
export const Stat = ({ label, value, hint, tone = 'neutral' }: StatProps): ReactElement => (
  <div className={cx('stat', tone !== 'neutral' && `stat--${tone}`)}>
    <span className="stat__label">{label}</span>
    <span className="stat__value">{value}</span>
    {hint ? <span className="stat__hint">{hint}</span> : null}
  </div>
);
