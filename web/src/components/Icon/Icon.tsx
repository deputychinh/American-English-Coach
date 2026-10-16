import type { ReactElement } from 'react';

import { ICON_PATHS } from '@/constants/icon.constant';
import type { IconName } from '@/enums/icon-name.enum';
import { cx } from '@/utils/cx.util';

import './Icon.css';

interface IconProps {
  name: IconName;
  /** Visible label for screen readers; omit for purely decorative icons. */
  label?: string;
  className?: string;
}

/** Inline SVG stroke icon sized by the surrounding font (1em) unless a class overrides it. */
export const Icon = ({ name, label, className }: IconProps): ReactElement => (
  <svg
    className={cx('icon', className)}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    role={label ? 'img' : undefined}
    aria-label={label}
    aria-hidden={label ? undefined : true}
    focusable="false"
  >
    <path d={ICON_PATHS[name]} />
  </svg>
);
