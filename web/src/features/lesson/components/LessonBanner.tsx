'use client';

import type { ReactElement } from 'react';

import { useCopy } from '@/hooks/useCopy';

import './LessonBanner.css';

interface LessonBannerProps {
  label: string;
  passed: string;
  scenario?: string;
}

/** Under the practice bar: the lesson step, the "passed" count and the communicative situation. */
export const LessonBanner = ({ label, passed, scenario }: LessonBannerProps): ReactElement => {
  const copy = useCopy();
  return (
    <header className="lesson-banner">
      <p className="lesson-banner__step">{label}</p>
      <p className="lesson-banner__passed" aria-live="polite">
        {passed}
      </p>
      {scenario ? (
        <p className="lesson-banner__scenario">
          <strong>{copy.lesson.scenario}:</strong> {scenario}
        </p>
      ) : null}
    </header>
  );
};
