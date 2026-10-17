'use client';

import Link from 'next/link';
import type { ReactElement } from 'react';

import { Card } from '@/components/Card/Card';
import { ErrorState } from '@/components/ErrorState/ErrorState';
import { Icon } from '@/components/Icon/Icon';
import { PageIntro } from '@/components/PageIntro/PageIntro';
import { Skeleton } from '@/components/Skeleton/Skeleton';
import { Stat } from '@/components/Stat/Stat';
import { AsyncStatus } from '@/enums/async-status.enum';
import { IconName } from '@/enums/icon-name.enum';
import { Language } from '@/enums/language.enum';
import { courseItemHref, getCourse } from '@/features/course/services/course.service';
import { useAsync } from '@/hooks/useAsync';
import { useCopy, useLanguage } from '@/hooks/useCopy';
import type { CourseDay } from '@/interfaces/practice.interface';
import { cx } from '@/utils/cx.util';

import './CourseScreen.css';

const dayState = (day: CourseDay, currentId: string): 'done' | 'current' | 'todo' => {
  if (day.is_done) return 'done';
  return day.id === currentId ? 'current' : 'todo';
};

/** The 14-day course: one collapsible card per day, the current day open, items link to drills. */
export const CourseScreen = (): ReactElement => {
  const copy = useCopy();
  const language = useLanguage();
  const { status, data, error, reload } = useAsync(getCourse);

  return (
    <div className="course-screen">
      <PageIntro title={copy.course.title} lead={copy.course.lead}>
        <Link href="/curriculum" className="button button--ghost">
          {copy.curriculum.title}
        </Link>
      </PageIntro>
      {status === AsyncStatus.Loading ? <Skeleton lines={6} /> : null}
      {status === AsyncStatus.Error ? <ErrorState message={error ?? ''} onRetry={reload} /> : null}
      {data ? (
        <>
          <div className="course-screen__stats">
            <Stat
              label={copy.course.statDone}
              value={`${data.completed_days}/${data.total_days}`}
              tone={data.completed_days === data.total_days ? 'success' : 'neutral'}
            />
            <Stat
              label={copy.course.statCurrent}
              value={copy.course.dayShort(
                data.days.find((d) => d.id === data.current_day)?.index ?? 1,
              )}
            />
          </div>
          <ol className="course-screen__days">
            {data.days.map((day) => {
              const state = dayState(day, data.current_day);
              return (
                <li key={day.id}>
                  <Card
                    as="section"
                    className={cx('course-screen__day', `course-screen__day--${state}`)}
                    aria-labelledby={`course-${day.id}`}
                  >
                    <details open={state === 'current'} className="course-screen__day-details">
                      <summary className="course-screen__day-summary">
                        <span className="course-screen__badge" aria-hidden="true">
                          {state === 'done' ? '✓' : day.index}
                        </span>
                        <span className="course-screen__day-text">
                          <span id={`course-${day.id}`} className="course-screen__day-title">
                            {copy.course.dayTitle(
                              day.index,
                              language === Language.En ? day.title_en : day.title_vi,
                            )}
                          </span>
                          <span className="course-screen__day-meta">
                            {copy.course.minutes(day.minutes)} ·{' '}
                            {copy.course.itemsDone(day.done_items, day.total_items)}
                            {state === 'current' ? ` · ${copy.course.currentBadge}` : ''}
                          </span>
                        </span>
                        <Icon name={IconName.ArrowRight} className="course-screen__chevron" />
                      </summary>
                      <p className="course-screen__goal">{day.goal_vi}</p>
                      <ul className="course-screen__items">
                        {day.items.map((item) => (
                          <li key={`${item.kind}:${item.id}`}>
                            <Link
                              href={courseItemHref(item)}
                              className={cx('course-screen__item', item.done && 'is-done')}
                            >
                              <span className="course-screen__item-kind">
                                {copy.course.kind[item.kind]}
                              </span>
                              <span className="course-screen__item-label">{item.label}</span>
                              <span className="course-screen__item-runs">
                                {item.done ? copy.course.runs(item.runs) : copy.course.notYet}
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </details>
                  </Card>
                </li>
              );
            })}
          </ol>
        </>
      ) : null}
    </div>
  );
};
