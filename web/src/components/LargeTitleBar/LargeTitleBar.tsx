import type { ReactElement } from 'react';

import { cx } from '@/utils/cx.util';

import './LargeTitleBar.css';

interface LargeTitleBarProps {
  title: string;
  /** The large title has scrolled away: show the small one in its place. */
  isShown: boolean;
}

/**
 * iOS large-title collapse on phones: once the page's big heading scrolls under the clock, the
 * same title appears small in a bar at the top. Decorative, the heading itself stays in the page.
 */
export const LargeTitleBar = ({ title, isShown }: LargeTitleBarProps): ReactElement => (
  <div className={cx('large-title-bar', isShown && 'is-shown')} aria-hidden="true">
    <span className="large-title-bar__text">{title}</span>
  </div>
);
