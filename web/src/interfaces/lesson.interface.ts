import type { ListenQuestion } from '@/interfaces/listening.interface';
import type {
  CurriculumUnit,
  MinimalPair,
  PhonemeCard,
  PracticeItem,
  Sentence,
  SoundDrill,
} from '@/interfaces/practice.interface';

/** Step 1: what the unit's sounds look and feel like. */
export interface LessonDescribeStep {
  kind: 'describe';
  notes: string;
  cards: PhonemeCard[];
}

/** Step 2: listening before speaking. */
export interface LessonListenStep {
  kind: 'discriminate';
  questions: ListenQuestion[];
}

/** A role-play line said by the app's voice, with its Vietnamese meaning. */
export interface LessonPartnerLine {
  text: string;
  vi: string;
}

/** Steps 3–5: scored speaking; `scenario` and the role-play only on the communicative step. */
export interface LessonSpeakStep {
  kind: 'controlled' | 'guided' | 'communicate';
  items: PracticeItem[];
  scenario?: string;
  /** Per item: the partner line said just before it (null when the learner speaks first). */
  partner?: (LessonPartnerLine | null)[];
  /** Per item: what the learner's line means, in Vietnamese. */
  meaning?: string[];
}

export type LessonStep = LessonDescribeStep | LessonListenStep | LessonSpeakStep;

export interface LessonPlan {
  unitId: string;
  title: string;
  steps: LessonStep[];
}

/** Where the learner is in a unit; stored so the lesson resumes after the app closes. */
export interface LessonPosition {
  step: number;
  index: number;
  /** Ids of the speaking items scored without an error (the "2 of 3" gate). */
  passed: string[];
  /** Ids of the speaking items the learner tried, passed or not. */
  tried: string[];
  listenCorrect: number;
  updatedAt: string;
}

export type LessonPositions = Record<string, LessonPosition>;

/** What a lesson is built from: the unit and the content its steps point to. */
export interface LessonContent {
  unit: CurriculumUnit;
  pairs: MinimalPair[];
  sentences: Sentence[];
  phonemes: PhonemeCard[];
  drills: SoundDrill[];
}
