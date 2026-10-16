import type { ReactElement } from 'react';

import type { TabOption } from '@/interfaces/tabs.interface';
import { cx } from '@/utils/cx.util';

import './Tabs.css';

interface TabsProps<T extends string> {
  label: string;
  value: T;
  options: readonly TabOption<T>[];
  onChange: (value: T) => void;
}

/** Segmented tab list (ARIA tabs); content panels are rendered by the caller. */
export const Tabs = <T extends string>({
  label,
  value,
  options,
  onChange,
}: TabsProps<T>): ReactElement => (
  <div className="tabs" role="tablist" aria-label={label}>
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
