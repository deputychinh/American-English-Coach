'use client';

import type { ReactElement, ReactNode } from 'react';

import './LessonSummary.css';

interface LessonSummaryProps {
  title: string;
  lines: string[];
  children: ReactNode;
}

/** A centred card between steps (the "2 of 3" gate) and at the end of the lesson. */
export const LessonSummary = ({ title, lines, children }: LessonSummaryProps): ReactElement => (
  <section className="lesson-summary" aria-labelledby="lesson-summary-title">
    <h2 id="lesson-summary-title" className="lesson-summary__title">
      {title}
    </h2>
    {lines.map((line) => (
      <p key={line} className="lesson-summary__line">
        {line}
      </p>
    ))}
    <div className="lesson-summary__actions">{children}</div>
  </section>
);
