import { MATCH_TOLERANCE } from '@/constants/mirror.constant';
import { MatchState } from '@/enums/match-state.enum';
import type { FeatureVerdict, MouthMatch } from '@/interfaces/mouth-match.interface';
import type { MouthFeatureName, MouthFeatures, TargetMap } from '@/interfaces/mouth.interface';
import { getCopy } from '@/locales';

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

/** How far outside its target range a value sits (0 when inside). */
const distanceOutside = (value: number, range: { min?: number; max?: number }): number => {
  if (range.min !== undefined && value < range.min) return range.min - value;
  if (range.max !== undefined && value > range.max) return value - range.max;
  return 0;
};

/** One verdict per target feature: inside, or which way to move and by how much. */
export const featureVerdicts = (features: MouthFeatures, targets: TargetMap): FeatureVerdict[] =>
  (Object.entries(targets) as [MouthFeatureName, { min?: number; max?: number }][]).map(
    ([name, range]) => {
      const value = features[name];
      const distance = distanceOutside(value, range);
      const direction =
        distance === 0 ? 'inside' : range.min !== undefined && value < range.min ? 'low' : 'high';
      return { name, value, direction, score: clamp01(1 - distance / MATCH_TOLERANCE) };
    },
  );

/** Overall 0..1 match of the mouth against the target ranges, plus the state the UI shows. */
export const matchMouth = (features: MouthFeatures | null, targets: TargetMap): MouthMatch => {
  const names = Object.keys(targets);
  if (!features || names.length === 0) {
    return { score: 0, state: MatchState.NoFace, verdicts: [], worst: null };
  }
  const verdicts = featureVerdicts(features, targets);
  const score = verdicts.reduce((sum, verdict) => sum + verdict.score, 0) / verdicts.length;
  const off = verdicts.filter((verdict) => verdict.direction !== 'inside');
  const worst = off.length ? off.reduce((a, b) => (b.score < a.score ? b : a)) : null;
  const state =
    off.length === 0 ? MatchState.OnTarget : score >= 0.6 ? MatchState.Close : MatchState.Far;
  return { score, state, verdicts, worst };
};

/** The one thing to change right now, as a natural instruction ("Chu môi tròn hơn"). */
export const cueFor = (verdict: FeatureVerdict | null): string | null => {
  if (!verdict || verdict.direction === 'inside') return null;
  const cues = getCopy().mirror.cues[verdict.name];
  return verdict.direction === 'low' ? cues.increase : cues.decrease;
};
