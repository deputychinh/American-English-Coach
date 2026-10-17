import type { ReactElement } from 'react';

import { COPY } from '@/constants/copy.constant';
import type { PlanDay } from '@/interfaces/practice.interface';
import { cx } from '@/utils/cx.util';
import { formatDate } from '@/utils/format.util';

import './WeekStrip.css';

interface WeekStripProps {
  days: PlanDay[];
  today: string;
  label: string;
}

const weekdayOf = (iso: string): string => {
  const index = new Date(`${iso}T00:00:00`).getDay();
  return COPY.plan.weekdays[index] ?? '';
};

/** Seven day cells: filled when the goal was met, half when something was recorded, ring today. */
export const WeekStrip = ({ days, today, label }: WeekStripProps): ReactElement => (
  <ol className="week-strip" aria-label={label}>
    {days.map((day) => {
      const state = day.goal_met ? 'met' : day.runs > 0 ? 'some' : 'none';
      return (
        <li
          key={day.date}
          className={cx(
            'week-strip__day',
            `week-strip__day--${state}`,
            day.date === today && 'is-today',
          )}
          aria-current={day.date === today ? 'date' : undefined}
          aria-label={COPY.plan.dayLabel(formatDate(day.date), day.runs, day.goal_met)}
        >
          <span className="week-strip__weekday" aria-hidden="true">
            {weekdayOf(day.date)}
          </span>
          <span className="week-strip__dot" aria-hidden="true">
            {day.goal_met ? '✓' : day.runs > 0 ? day.runs : ''}
          </span>
        </li>
      );
    })}
  </ol>
);
