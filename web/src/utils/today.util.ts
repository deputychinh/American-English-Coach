import { TODAY_MINUTES, TODAY_ORDER } from '@/constants/today.constant';
import { TodayStatus } from '@/enums/today-status.enum';
import { TodayStep } from '@/enums/today-step.enum';
import type { TodayInput, TodayPlan } from '@/interfaces/today.interface';

/**
 * Today's 15 minutes, worked out from what is on the device rather than ticked by hand: a
 * review step is done when nothing is left to study today, the unit step when its lesson has
 * moved on since the session sent the learner there, the speaking step when a "Nói 3 lần" was
 * finished today. Closing the app therefore never loses the place.
 */

/** Local calendar day as YYYY-MM-DD. */
export const dayKey = (date: Date): string =>
  [
    String(date.getFullYear()),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');

const isUnitDone = ({ unit, unitStep, record }: TodayInput): boolean => {
  if (!unit || unitStep >= unit.steps) return true;
  return record?.unitId === unit.id && unitStep > record.unitStartStep;
};

export const isTodayStepDone = (step: TodayStep, input: TodayInput): boolean => {
  switch (step) {
    case TodayStep.Vocab:
      return input.vocabLeft === 0;
    case TodayStep.Talk:
      return input.talkLeft === 0;
    case TodayStep.Unit:
      return isUnitDone(input);
    case TodayStep.Speak:
      return input.spokeToday;
  }
};

/** Each step's status: done ones, the first open one as next, the rest waiting. */
export const planToday = (input: TodayInput): TodayPlan => {
  let hasNext = false;
  const steps = TODAY_ORDER.map((step) => {
    const isDone = isTodayStepDone(step, input);
    const status = isDone ? TodayStatus.Done : hasNext ? TodayStatus.Waiting : TodayStatus.Next;
    if (!isDone) hasNext = true;
    return { step, status, minutes: TODAY_MINUTES[step] };
  });
  return {
    steps,
    next: steps.find((state) => state.status === TodayStatus.Next) ?? null,
    done: steps.filter((state) => state.status === TodayStatus.Done).length,
  };
};
