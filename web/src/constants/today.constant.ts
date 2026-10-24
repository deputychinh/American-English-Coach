import { TodayStep } from '@/enums/today-step.enum';

/** Due cards first, then the unit's next step, then one speaking task (plan v2 §3.1). */
export const TODAY_ORDER: readonly TodayStep[] = [
  TodayStep.Vocab,
  TodayStep.Talk,
  TodayStep.Unit,
  TodayStep.Speak,
];

/** Rough minutes per step; together about a quarter of an hour. */
export const TODAY_MINUTES: Readonly<Record<TodayStep, number>> = {
  [TodayStep.Vocab]: 4,
  [TodayStep.Talk]: 3,
  [TodayStep.Unit]: 5,
  [TodayStep.Speak]: 3,
};

/** Query flag a screen gets when it is opened from today's session. */
export const TODAY_FROM = 'today';
