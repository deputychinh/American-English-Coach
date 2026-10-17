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
