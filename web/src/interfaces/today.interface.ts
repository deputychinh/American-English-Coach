import type { TodayStatus } from '@/enums/today-status.enum';
import type { TodayStep } from '@/enums/today-step.enum';

/** Where the unit's lesson stood when today's session sent the learner to it. */
export interface TodayRecord {
  /** Local day, YYYY-MM-DD. */
  date: string;
  profileId: string;
  unitId: string;
  unitStartStep: number;
}

export interface TodayUnit {
  id: string;
  title: string;
  steps: number;
}

/** What the day's session is built from; everything is read from the device. */
export interface TodayInput {
  vocabLeft: number;
  talkLeft: number;
  unit: TodayUnit | null;
  /** Step reached in the unit's lesson (0 before it is opened). */
  unitStep: number;
  record: TodayRecord | null;
  spokeToday: boolean;
  topic: string | null;
}

/** The screen that does a step, opened with `from=today`. */
export interface TodayHref {
  pathname: '/vocab' | '/talk' | '/lesson' | '/fluency';
  query: Record<string, string>;
}

export interface TodayStepState {
  step: TodayStep;
  status: TodayStatus;
  minutes: number;
}

export interface TodayPlan {
  steps: TodayStepState[];
  next: TodayStepState | null;
  done: number;
}

export interface TodayState extends TodayPlan {
  input: TodayInput;
}
