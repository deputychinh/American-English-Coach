'use client';

import Link from 'next/link';
import type { ReactElement, ReactNode } from 'react';

import { Icon } from '@/components/Icon/Icon';
import { IconName } from '@/enums/icon-name.enum';
import { useCopy } from '@/hooks/useCopy';

import './LessonHeader.css';

interface LessonHeaderProps {
  closeHref: string;
  title: string;
  subtitle?: string;
  /** 0..1; omitted when the lesson has no countable steps. */
  progress?: number;
  trailing?: ReactNode;
}

/** Lesson player bar (Duolingo / ELSA pattern): close, title, progress, one optional action. */
export const LessonHeader = ({
  closeHref,
  title,
  subtitle,
  progress,
  trailing = null,
}: LessonHeaderProps): ReactElement => {
  const copy = useCopy();
  return (
    <header className="lesson-header">
      <div className="lesson-header__row">
        <Link href={closeHref} className="lesson-header__close" aria-label={copy.common.close}>
          <Icon name={IconName.Close} />
        </Link>
        <div className="lesson-header__text">
          <h1 className="lesson-header__title">{title}</h1>
          {subtitle ? <p className="lesson-header__subtitle">{subtitle}</p> : null}
        </div>
        {trailing}
      </div>
      {progress !== undefined ? (
        <span
          className="lesson-header__bar"
          role="progressbar"
          aria-label={title}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
        >
          <span
            className="lesson-header__fill"
            style={{ inlineSize: `${String(Math.round(Math.min(1, progress) * 100))}%` }}
          />
        </span>
      ) : null}
    </header>
  );
};
