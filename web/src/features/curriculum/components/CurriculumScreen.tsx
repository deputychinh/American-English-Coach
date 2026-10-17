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
import { UnitSteps } from '@/features/curriculum/components/UnitSteps';
import { getCurriculum } from '@/features/curriculum/services/curriculum.service';
import { useAsync } from '@/hooks/useAsync';
import { useCopy, useLanguage } from '@/hooks/useCopy';
import type { CurriculumUnit } from '@/interfaces/practice.interface';
import { cx } from '@/utils/cx.util';

import './CurriculumScreen.css';
import './UnitSteps.css';

const unitState = (unit: CurriculumUnit, currentId: string): 'done' | 'current' | 'todo' => {
  if (unit.progress.is_done) return 'done';
  return unit.id === currentId ? 'current' : 'todo';
};

/** Levels and units of the curriculum; the current unit is open with its five steps. */
export const CurriculumScreen = (): ReactElement => {
  const copy = useCopy();
  const language = useLanguage();
  const { status, data, error, reload } = useAsync(getCurriculum);

  return (
    <div className="curriculum-screen">
      <PageIntro title={copy.curriculum.title} lead={copy.curriculum.lead}>
        <Link href="/course" className="button button--ghost">
          {copy.curriculum.quickPath}
        </Link>
      </PageIntro>
      {status === AsyncStatus.Loading ? <Skeleton lines={6} /> : null}
      {status === AsyncStatus.Error ? <ErrorState message={error ?? ''} onRetry={reload} /> : null}
      {data ? (
        <>
          <div className="curriculum-screen__stats">
            <Stat
              label={copy.curriculum.statDone}
              value={`${data.completed_units}/${data.total_units}`}
              tone={data.completed_units === data.total_units ? 'success' : 'neutral'}
            />
            <Stat
              label={copy.curriculum.statCurrent}
              value={copy.curriculum.unitShort(
                data.levels.flatMap((l) => l.units).find((u) => u.id === data.current_unit)
                  ?.index ?? 1,
              )}
            />
          </div>
          {data.levels.map((level) => (
            <section
              key={level.id}
              className="curriculum-screen__level"
              aria-labelledby={`level-${level.id}`}
            >
              <h2 id={`level-${level.id}`} className="curriculum-screen__level-title">
                {copy.curriculum.levelTitle(
                  level.id,
                  language === Language.En ? level.title_en : level.title_vi,
                )}
              </h2>
              <p className="curriculum-screen__level-meta">
                {level.goal_vi} · {copy.curriculum.unitsDone(level.done_units, level.units.length)}
              </p>
              <ol className="curriculum-screen__units">
                {level.units.map((unit) => {
                  const state = unitState(unit, data.current_unit);
                  return (
                    <li key={unit.id}>
                      <Card
                        as="section"
                        className={cx(
                          'curriculum-screen__unit',
                          `curriculum-screen__unit--${state}`,
                        )}
                        aria-labelledby={`unit-${unit.id}`}
                      >
                        <details open={state === 'current'} className="curriculum-screen__details">
                          <summary className="curriculum-screen__summary">
                            <span className="curriculum-screen__badge" aria-hidden="true">
                              {state === 'done' ? '✓' : unit.index}
                            </span>
                            <span className="curriculum-screen__text">
                              <span id={`unit-${unit.id}`} className="curriculum-screen__title">
                                {language === Language.En ? unit.title_en : unit.title_vi}
                              </span>
                              <span className="curriculum-screen__meta">
                                {copy.curriculum.meta(unit.days, unit.minutes)}
                                {state === 'current' ? ` · ${copy.curriculum.currentBadge}` : ''}
                                {state === 'done' ? ` · ${copy.curriculum.doneBadge}` : ''}
                              </span>
                            </span>
                            <Icon
                              name={IconName.ArrowRight}
                              className="curriculum-screen__chevron"
                            />
                          </summary>
                          <p className="curriculum-screen__goal">{unit.goal_vi}</p>
                          <p className="curriculum-screen__error">
                            <strong>{copy.curriculum.vnError}:</strong> {unit.vn_error_vi}
                          </p>
                          <UnitSteps unit={unit} />
                        </details>
                      </Card>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </>
      ) : null}
    </div>
  );
};
