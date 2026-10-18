'use client';

import Link from 'next/link';
import type { ReactElement } from 'react';

import { ConfidenceBadge } from '@/components/ConfidenceBadge/ConfidenceBadge';
import { courseItemHref } from '@/features/course/services/course.service';
import { listenAccuracy, readListenResults } from '@/features/listen/services/listen.service';
import { useCopy } from '@/hooks/useCopy';
import type { CurriculumStep, CurriculumUnit } from '@/interfaces/practice.interface';
import { cx } from '@/utils/cx.util';

interface UnitStepsProps {
  unit: CurriculumUnit;
  /** Display label per `kind:id`; ids are shown when a label is missing. */
  labels?: Record<string, string>;
}

const stepKey = (step: CurriculumStep): keyof ReturnType<typeof useCopy>['curriculum']['steps'] =>
  step.kind;

/** The five steps of a unit: links where a screen exists, labelled badges where one is coming. */
export const UnitSteps = ({ unit, labels = {} }: UnitStepsProps): ReactElement => {
  const copy = useCopy();
  const doneIds = new Set(unit.progress.done_ids);
  const listened = listenAccuracy(readListenResults(), unit.id);
  return (
    <ol className="unit-steps">
      {unit.steps.map((step, index) => (
        <li key={step.kind} className="unit-steps__step">
          <span className="unit-steps__number" aria-hidden="true">
            {index + 1}
          </span>
          <div className="unit-steps__body">
            <p className="unit-steps__title">{copy.curriculum.steps[stepKey(step)]}</p>
            {'notes_vi' in step ? (
              <>
                <p className="unit-steps__text">{step.notes_vi}</p>
                <ul className="unit-steps__chips">
                  {step.sounds.map((sound) => (
                    <li key={sound}>
                      <Link
                        href={{ pathname: '/sounds', query: { id: sound } }}
                        className="unit-steps__chip"
                      >
                        {labels[`sound:${sound}`] ?? sound}
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
            {'pairs' in step ? (
              <>
                <p className="unit-steps__text">
                  {copy.curriculum.discriminateSummary(
                    step.pairs.length,
                    step.stress.length,
                    step.focus.length,
                  )}
                </p>
                <ul className="unit-steps__chips">
                  <li>
                    <Link
                      href={{ pathname: '/listen', query: { unit: unit.id } }}
                      className={cx('unit-steps__chip', listened !== null && 'is-done')}
                    >
                      {listened === null
                        ? copy.listen.start
                        : copy.listen.doneBadge(Math.round(listened * 100))}
                    </Link>
                  </li>
                </ul>
              </>
            ) : null}
            {'items' in step ? (
              <ul className="unit-steps__chips">
                {step.items.map((item) => {
                  const isDone = doneIds.has(`${item.kind}:${item.id}`);
                  return (
                    <li key={`${item.kind}:${item.id}`}>
                      <Link
                        href={courseItemHref(item)}
                        className={cx('unit-steps__chip', isDone && 'is-done')}
                      >
                        {copy.course.kind[item.kind]} ·{' '}
                        {labels[`${item.kind}:${item.id}`] ?? item.id}
                        {isDone ? (
                          <span className="visually-hidden"> {copy.curriculum.itemDone}</span>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : null}
            {'sentences' in step ? (
              <ul className="unit-steps__chips">
                {step.sentences.map((sentence) => (
                  <li key={sentence}>
                    <Link
                      href={{ pathname: '/practice', query: { item: `sentence:${sentence}` } }}
                      className="unit-steps__chip"
                    >
                      {labels[`sentence:${sentence}`] ?? sentence}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
            {'scenario_vi' in step ? (
              <>
                <p className="unit-steps__text">
                  {step.scenario_vi}
                  <span className="unit-steps__badge">{copy.curriculum.proSoon}</span>
                </p>
                <p className="unit-steps__muted">
                  {copy.curriculum.targetWords}: {step.target_words.join(', ')}
                </p>
              </>
            ) : null}
          </div>
        </li>
      ))}
      <li className="unit-steps__confidence">
        <ConfidenceBadge confidence={unit.focus_sounds.length ? 'high' : 'low'} />
      </li>
    </ol>
  );
};
