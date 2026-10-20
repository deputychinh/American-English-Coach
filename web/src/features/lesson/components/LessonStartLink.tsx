'use client';

import Link from 'next/link';
import type { ReactElement } from 'react';

import { readLessonPosition } from '@/features/lesson/services/lesson-position.service';
import { useCopy } from '@/hooks/useCopy';
import type { CurriculumUnit } from '@/interfaces/practice.interface';

interface LessonStartLinkProps {
  unit: CurriculumUnit;
}

/** Opens the unit in the lesson player: start, continue at the saved step, or take it again. */
export const LessonStartLink = ({ unit }: LessonStartLinkProps): ReactElement => {
  const copy = useCopy();
  const position = readLessonPosition(unit.id);
  const total = unit.steps.length;
  const label = !position
    ? copy.lesson.start
    : position.step >= total
      ? copy.lesson.review
      : copy.lesson.resume(position.step + 1, total);
  return (
    <Link
      href={{ pathname: '/lesson', query: { unit: unit.id } }}
      className="button button--primary button--full-width"
    >
      {label}
    </Link>
  );
};
