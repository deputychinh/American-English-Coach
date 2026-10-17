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
export type SoundDrill = components['schemas']['SoundDrill'];
export type SoundDrillSummary = components['schemas']['SoundDrillSummary'];
export type TutorReply = components['schemas']['TutorReply'];
export type Profile = components['schemas']['ProfileModel'];
export type ProfileExport = components['schemas']['ProfileExport'];
export type ImportResult = components['schemas']['ImportResult'];
export type PlanResponse = components['schemas']['PlanResponse'];
export type PlanDay = components['schemas']['PlanDay'];
export type PlanFocus = components['schemas']['PlanFocus'];

/** The profile this device works in (stored locally; the API is told through a header). */
export interface ActiveProfile {
  id: string;
  name: string;
}

/** What the learner is about to say, resolved from the `item` search param. */
export interface PairedDevice {
  token: string;
  deviceName: string;
}

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

export type DrillStage = 'word' | 'pair' | 'sentence';

/** One step of a per-sound drill: the practice item plus which part of the drill it came from. */
export interface DrillItem {
  item: PracticeItem;
  stage: DrillStage;
}

/** Running score of a drill, counted on the target phone only. */
export interface DrillTally {
  ok: number;
  check: number;
  error: number;
  skipped: number;
  failedIds: string[];
}

export interface MouthAskRequest {
  image: Blob;
  soundIpa: string;
  targetVi: string;
}

export interface TutorAvailability {
  isAvailable: boolean;
  model: string | null;
}
