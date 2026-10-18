import type { MatchState } from '@/enums/match-state.enum';
import type { MouthFeatureName } from '@/interfaces/mouth.interface';

export type VerdictDirection = 'inside' | 'low' | 'high';

export interface FeatureVerdict {
  name: MouthFeatureName;
  value: number;
  direction: VerdictDirection;
  /** 1 inside the range, falling linearly to 0 one tolerance away. */
  score: number;
}

export interface MouthMatch {
  /** Mean feature score, 0..1. */
  score: number;
  state: MatchState;
  verdicts: FeatureVerdict[];
  /** The feature furthest from its range, or null when everything is inside. */
  worst: FeatureVerdict | null;
}

export type SpeakOutcomeKind = 'both' | 'sound' | 'noFace' | 'mouth' | 'neither';

/** Result of one "say it in the mirror" attempt. */
export interface SpeakOutcome {
  kind: SpeakOutcomeKind;
  /** Worst verdict on the target phone, null when it was not heard at all. */
  sound: 'ok' | 'check' | 'error' | null;
  /** Share of usable speaking frames on target; null when the camera cannot judge this sound. */
  mouthRate: number | null;
  isPass: boolean;
}

export type SpeakPhase = 'idle' | 'listening' | 'scoring' | 'result' | 'silent';
