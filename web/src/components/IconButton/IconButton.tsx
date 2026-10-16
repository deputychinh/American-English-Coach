import type { ButtonHTMLAttributes, ReactElement } from 'react';

import { Icon } from '@/components/Icon/Icon';
import type { IconName } from '@/enums/icon-name.enum';
import { cx } from '@/utils/cx.util';

import './IconButton.css';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconName;
  /** Required: the accessible name of the control. */
  label: string;
  isOnBrand?: boolean;
}

/** 44 px round button with a single icon and an accessible label. */
export const IconButton = ({
  icon,
  label,
  isOnBrand = false,
  className,
  type = 'button',
  ...rest
}: IconButtonProps): ReactElement => (
  <button
    type={type}
    className={cx('icon-button', isOnBrand && 'icon-button--on-brand', className)}
    aria-label={label}
    title={label}
    {...rest}
  >
    <Icon name={icon} />
  </button>
);
