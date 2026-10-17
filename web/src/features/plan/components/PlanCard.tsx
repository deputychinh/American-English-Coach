'use client';

import { type ReactElement, useCallback } from 'react';

import { FocusReason } from '@/api/coach.schema';
import { Card } from '@/components/Card/Card';
import { ErrorState } from '@/components/ErrorState/ErrorState';
import { ListRow } from '@/components/ListRow/ListRow';
import { SectionHeader } from '@/components/SectionHeader/SectionHeader';
import { Skeleton } from '@/components/Skeleton/Skeleton';
import { WeekStrip } from '@/components/WeekStrip/WeekStrip';
import { DEFAULT_DAILY_GOAL } from '@/constants/plan.constant';
import { AsyncStatus } from '@/enums/async-status.enum';
import { StorageKey } from '@/enums/storage-key.enum';
import { getPlan } from '@/features/plan/services/plan.service';
import { useAsync } from '@/hooks/useAsync';
import { useCopy } from '@/hooks/useCopy';
import { useStoredState } from '@/hooks/useStoredState';
import type { PlanFocus } from '@/interfaces/practice.interface';
import { formatPercent } from '@/utils/format.util';

import './PlanCard.css';

interface PlanCardProps {
  /** Home shows the focus list; Progress shows only the week and the streak. */
  showFocus?: boolean;
  headingId: string;
}

/** "Hôm nay luyện gì": goal progress, streak, the last seven days and up to three focus sounds. */
export const PlanCard = ({ showFocus = true, headingId }: PlanCardProps): ReactElement => {
  const copy = useCopy();
  const [goal] = useStoredState<number>(StorageKey.DailyGoal, DEFAULT_DAILY_GOAL);
  const load = useCallback(() => getPlan(goal), [goal]);
  const { status, data, error, reload } = useAsync(load);

  const reasonText = (focus: PlanFocus): string => {
    if (focus.reason === FocusReason.weak)
      return copy.plan.reasonWeak(formatPercent(focus.ok_rate ?? 0, 1), focus.total);
    if (focus.reason === FocusReason.review) return copy.plan.reasonReview(focus.days_since ?? 0);
    return copy.plan.reasonNew;
  };
  const reasonBadge: Record<PlanFocus['reason'], string> = {
    weak: 'badge badge--warning',
    review: 'badge badge--subtle',
    new: 'badge badge--neutral',
  };
  const percent = data ? Math.min(100, Math.round((data.runs_today / data.goal_runs) * 100)) : 0;

  return (
    <Card as="section" aria-labelledby={headingId} className="plan-card">
      <SectionHeader
        id={headingId}
        title={showFocus ? copy.plan.title : copy.plan.weekTitle}
        hint={showFocus ? copy.plan.hint : undefined}
      >
        {data && data.streak_days > 0 ? (
          <span className="badge badge--brand plan-card__streak">
            {copy.plan.streak(data.streak_days)}
          </span>
        ) : null}
      </SectionHeader>
      {status === AsyncStatus.Loading ? <Skeleton lines={3} /> : null}
      {status === AsyncStatus.Error ? (
        <ErrorState message={error ?? copy.plan.loadFailed} onRetry={reload} />
      ) : null}
      {data ? (
        <>
          <div className="plan-card__goal">
            <div className="plan-card__goal-row">
              <span className="plan-card__goal-text">
                {copy.plan.goalProgress(data.runs_today, data.goal_runs)}
              </span>
              <span className="plan-card__muted">
                {data.runs_today >= data.goal_runs ? copy.plan.goalDone : copy.plan.goalHint}
              </span>
            </div>
            <span
              className="plan-card__bar"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={data.goal_runs}
              aria-valuenow={Math.min(data.runs_today, data.goal_runs)}
              aria-label={copy.plan.goalAria}
            >
              <span className="plan-card__bar-fill" style={{ inlineSize: `${percent}%` }} />
            </span>
          </div>
          <WeekStrip days={data.week} today={data.today} label={copy.plan.weekAria} />
          <p className="plan-card__muted">
            {copy.plan.coverage(data.practised_sounds, data.total_sounds)}
          </p>
          {showFocus ? (
            <div className="plan-card__focus">
              {data.focus.length === 0 ? (
                <p className="plan-card__muted">{copy.plan.empty}</p>
              ) : (
                data.focus.map((focus) => (
                  <ListRow
                    key={focus.phoneme}
                    leading={<span className="ipa-pill">/{focus.ipa}/</span>}
                    title={
                      <span className="plan-card__focus-title">
                        <span className={reasonBadge[focus.reason]}>
                          {copy.plan.reasonLabel[focus.reason]}
                        </span>
                        {reasonText(focus)}
                      </span>
                    }
                    trailing={copy.practice.practiceNow}
                    href={
                      focus.sound_id
                        ? { pathname: '/practice', query: { sound: focus.sound_id } }
                        : { pathname: '/mirror', query: { sound: focus.phoneme } }
                    }
                  />
                ))
              )}
            </div>
          ) : null}
        </>
      ) : null}
    </Card>
  );
};
