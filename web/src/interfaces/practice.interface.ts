import type { components } from '@/api/coach.schema';

export type AssessmentResponse = components['schemas']['AssessmentResponse'];
export type PhoneResult = components['schemas']['PhoneResult'];
export type WordResult = components['schemas']['WordResult'];
export type ProsodyResult = components['schemas']['ProsodyResult'];
export type PhonemeCard = components['schemas']['PhonemeCard'];
export type MinimalPair = components['schemas']['MinimalPair'];
export type Sentence = components['schemas']['Sentence'];
export type VisemeContent = components['schemas']['VisemeContent'];
export type VisemeTargetCard = components['schemas']['VisemeTargetCard'];
export type CalibrationStep = components['schemas']['CalibrationStep'];
export type ProgressResponse = components['schemas']['ProgressResponse'];
export type HealthResponse = components['schemas']['HealthResponse'];
export type FocusItem = components['schemas']['FocusItem'];

/** What the learner is about to say, resolved from the `item` search param. */
export interface PracticeItem {
  id: string;
  text: string;
  kind: 'word' | 'statement' | 'question' | 'wh_question';
  title: string;
  focus: string[];
}

export interface ProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  code?: string;
}

export interface Recording {
  blob: Blob;
  url: string;
  startedAt: number;
  durationSeconds: number;
}
