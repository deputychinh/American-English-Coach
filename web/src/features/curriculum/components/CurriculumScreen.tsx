'use client';

import Link from 'next/link';
import { type ReactElement, useState } from 'react';

import { ErrorState } from '@/components/ErrorState/ErrorState';
import { Icon } from '@/components/Icon/Icon';
import { PageIntro } from '@/components/PageIntro/PageIntro';
import { Sheet } from '@/components/Sheet/Sheet';
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
  const [openId, setOpenId] = useState<string | null>(null);
  const units = data ? data.levels.flatMap((level) => level.units) : [];
  const open = units.find((unit) => unit.id === openId) ?? null;

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
                      <button
                        type="button"
                        className={cx(
                          'curriculum-screen__unit',
                          `curriculum-screen__unit--${state}`,
                        )}
                        aria-haspopup="dialog"
                        onClick={() => setOpenId(unit.id)}
                      >
                        <span className="curriculum-screen__badge" aria-hidden="true">
                          {state === 'done' ? '✓' : unit.index}
                        </span>
                        <span className="curriculum-screen__text">
                          <span className="curriculum-screen__title">
                            {language === Language.En ? unit.title_en : unit.title_vi}
                          </span>
                          <span className="curriculum-screen__meta">
                            {copy.curriculum.meta(unit.days, unit.minutes)}
                            {state === 'current' ? ` · ${copy.curriculum.currentBadge}` : ''}
                            {state === 'done' ? ` · ${copy.curriculum.doneBadge}` : ''}
                          </span>
                        </span>
                        <Icon name={IconName.ArrowRight} className="curriculum-screen__chevron" />
                      </button>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
          <Sheet
            isOpen={open !== null}
            title={open ? (language === Language.En ? open.title_en : open.title_vi) : ''}
            onClose={() => setOpenId(null)}
          >
            {open ? (
              <div className="curriculum-screen__sheet">
                <p className="curriculum-screen__goal">{open.goal_vi}</p>
                <p className="curriculum-screen__error">
                  <strong>{copy.curriculum.vnError}:</strong> {open.vn_error_vi}
                </p>
                <UnitSteps unit={open} labels={data.labels} />
              </div>
            ) : null}
          </Sheet>
        </>
      ) : null}
    </div>
  );
};
