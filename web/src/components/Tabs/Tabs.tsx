import type { ReactElement } from 'react';

import type { TabOption } from '@/interfaces/tabs.interface';
import { cx } from '@/utils/cx.util';

import './Tabs.css';

interface TabsProps<T extends string> {
  label: string;
  value: T;
  options: readonly TabOption<T>[];
  onChange: (value: T) => void;
  /** Full-width segmented control with equal segments (top-level switch of a screen). */
  isFill?: boolean;
}

/** Segmented tab list (ARIA tabs); content panels are rendered by the caller. */
export const Tabs = <T extends string>({
  label,
  value,
  options,
  onChange,
  isFill = false,
}: TabsProps<T>): ReactElement => (
  <div className={cx('tabs', isFill && 'tabs--fill')} role="tablist" aria-label={label}>
    {options.map((option) => (
      <button
        key={option.id}
        type="button"
        role="tab"
        aria-selected={option.id === value}
        className={cx('tabs__tab', option.id === value && 'is-active')}
        onClick={() => onChange(option.id)}
      >
        {option.label}
      </button>
    ))}
  </div>
);
