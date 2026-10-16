import type { HTMLAttributes, ReactElement, ReactNode } from 'react';

import { cx } from '@/utils/cx.util';

import './Card.css';

interface CardProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  /** Semantic element; `section` when the card has its own heading. */
  as?: 'div' | 'section' | 'article' | 'li';
  isTinted?: boolean;
  isInteractive?: boolean;
}

/** Surface with the product's padding, radius and shadow; the only card style in the app. */
export const Card = ({
  children,
  as: Tag = 'div',
  isTinted = false,
  isInteractive = false,
  className,
  ...rest
}: CardProps): ReactElement => (
  <Tag
    className={cx(
      'card',
      isTinted && 'card--tinted',
      isInteractive && 'card--interactive',
      className,
    )}
    {...rest}
  >
    {children}
  </Tag>
);
