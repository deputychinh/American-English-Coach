import { TodayStatus } from '@/enums/today-status.enum';
import { TodayStep } from '@/enums/today-step.enum';
import type { TodayInput } from '@/interfaces/today.interface';
import { dayKey, isTodayStepDone, planToday } from '@/utils/today.util';

const input = (over: Partial<TodayInput> = {}): TodayInput => ({
  vocabLeft: 8,
  talkLeft: 5,
  unit: { id: 'u03', title: 'Âm /θ/ và /ð/', steps: 5 },
  unitStep: 1,
  record: null,
  spokeToday: false,
  topic: 'Gia đình bạn',
  ...over,
});

const statuses = (value: TodayInput): TodayStatus[] =>
  planToday(value).steps.map((state) => state.status);

describe('today util', () => {
  it('writes the local day as YYYY-MM-DD', () => {
    expect(dayKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });

  it('starts with the due cards and keeps the rest waiting, about 15 minutes in all', () => {
    const plan = planToday(input());
    expect(plan.steps.map((state) => state.step)).toEqual([
      TodayStep.Vocab,
      TodayStep.Talk,
      TodayStep.Unit,
      TodayStep.Speak,
    ]);
    expect(statuses(input())).toEqual([
      TodayStatus.Next,
      TodayStatus.Waiting,
      TodayStatus.Waiting,
      TodayStatus.Waiting,
    ]);
    expect(plan.steps.reduce((sum, state) => sum + state.minutes, 0)).toBe(15);
    expect(plan.next?.step).toBe(TodayStep.Vocab);
    expect(plan.done).toBe(0);
  });

  it('moves on as cards run out, the lesson advances and a speaking task is done', () => {
    const today = '2026-10-24';
    const started = { date: today, profileId: 'default', unitId: 'u03', unitStartStep: 1 };
    expect(statuses(input({ vocabLeft: 0, talkLeft: 0 }))).toEqual([
      TodayStatus.Done,
      TodayStatus.Done,
      TodayStatus.Next,
      TodayStatus.Waiting,
    ]);
    // Opening the lesson is not enough: its step has to move on since the session sent you.
    expect(isTodayStepDone(TodayStep.Unit, input({ record: started }))).toBe(false);
    expect(isTodayStepDone(TodayStep.Unit, input({ record: started, unitStep: 2 }))).toBe(true);
    // Another unit's record does not count.
    expect(
      isTodayStepDone(
        TodayStep.Unit,
        input({ record: { ...started, unitId: 'u02' }, unitStep: 3 }),
      ),
    ).toBe(false);
    const all = input({
      vocabLeft: 0,
      talkLeft: 0,
      record: started,
      unitStep: 2,
      spokeToday: true,
    });
    expect(planToday(all)).toMatchObject({ next: null, done: 4 });
  });

  it('counts the unit step as done when the path or the lesson is finished', () => {
    expect(isTodayStepDone(TodayStep.Unit, input({ unit: null }))).toBe(true);
    expect(isTodayStepDone(TodayStep.Unit, input({ unitStep: 5 }))).toBe(true);
  });
});
