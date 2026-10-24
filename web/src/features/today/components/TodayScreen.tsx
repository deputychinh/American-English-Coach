'use client';

import Link from 'next/link';
import type { ReactElement } from 'react';

import { ErrorState } from '@/components/ErrorState/ErrorState';
import { Icon } from '@/components/Icon/Icon';
import { LessonHeader } from '@/components/LessonHeader/LessonHeader';
import { Skeleton } from '@/components/Skeleton/Skeleton';
import { TODAY_FROM } from '@/constants/today.constant';
import { AsyncStatus } from '@/enums/async-status.enum';
import { IconName } from '@/enums/icon-name.enum';
import { TodayStatus } from '@/enums/today-status.enum';
import { TodayStep } from '@/enums/today-step.enum';
import { loadToday, startUnitStep } from '@/features/today/services/today.service';
import { useAsync } from '@/hooks/useAsync';
import { useCopy } from '@/hooks/useCopy';
import type { TodayHref, TodayInput } from '@/interfaces/today.interface';
import { cx } from '@/utils/cx.util';

import './TodayScreen.css';

/** Where each step is done; the screen gets `from=today` so it can lead back here. */
export const todayHref = (step: TodayStep, input: TodayInput): TodayHref => {
  const unit = input.unit?.id ?? 'u01';
  switch (step) {
    case TodayStep.Vocab:
      return { pathname: '/vocab', query: { from: TODAY_FROM } };
    case TodayStep.Talk:
      return { pathname: '/talk', query: { from: TODAY_FROM } };
    case TodayStep.Unit:
      return { pathname: '/lesson', query: { unit, from: TODAY_FROM } };
    case TodayStep.Speak:
      return { pathname: '/fluency', query: { unit, from: TODAY_FROM } };
  }
};

/** "Hôm nay 15 phút" (plan v2 §3.1): due cards, the unit's next step, one speaking task. */
export const TodayScreen = (): ReactElement => {
  const copy = useCopy().session;
  const state = useAsync(loadToday);

  if (state.status === AsyncStatus.Error) {
    return <ErrorState message={state.error ?? ''} onRetry={state.reload} />;
  }
  if (!state.data) return <Skeleton lines={6} />;
  const { steps, next, done, input } = state.data;

  const detail = (step: TodayStep): string => {
    switch (step) {
      case TodayStep.Vocab:
        return copy.vocabLine(input.vocabLeft);
      case TodayStep.Talk:
        return copy.talkLine(input.talkLeft);
      case TodayStep.Unit:
        return input.unit ? copy.unitLine(input.unit.title) : copy.unitNone;
      case TodayStep.Speak:
        return input.topic ? copy.speakLine(input.topic) : '';
    }
  };
  const open = (step: TodayStep): void => {
    if (step === TodayStep.Unit && input.unit) startUnitStep(input.unit.id);
  };

  return (
    <div className="today-screen">
      <LessonHeader
        closeHref="/"
        title={copy.title}
        subtitle={copy.progress(done, steps.length)}
        progress={done / steps.length}
      />
      <div className="today-screen__body">
        <p className="today-screen__lead">{copy.lead}</p>
        <ol className="today-screen__steps">
          {steps.map(({ step, status, minutes }) => (
            <li key={step}>
              <Link
                href={todayHref(step, input)}
                className={cx('today-screen__step', `is-${status}`)}
                onClick={() => open(step)}
              >
                <span className="today-screen__mark" aria-hidden="true">
                  {status === TodayStatus.Done ? <Icon name={IconName.Check} /> : null}
                </span>
                <span className="today-screen__text">
                  <span className="today-screen__name">{copy.steps[step]}</span>
                  <span className="today-screen__detail">{detail(step)}</span>
                </span>
                <span className="today-screen__meta">
                  <span className="today-screen__status">{copy.status[status]}</span>
                  <span>{copy.minutes(minutes)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
        {next ? (
          <Link
            href={todayHref(next.step, input)}
            className="button button--primary button--full-width"
            onClick={() => open(next.step)}
          >
            {done === 0 ? copy.start : copy.resume(copy.steps[next.step])}
          </Link>
        ) : (
          <p className="today-screen__done" role="status">
            {copy.allDone}
          </p>
        )}
      </div>
    </div>
  );
};
