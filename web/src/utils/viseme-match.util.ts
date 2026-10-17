import type { MouthFeatureName, MouthFeatures, TargetMap } from '@/interfaces/mouth.interface';
import { getCopy } from '@/locales';

/** Names of features currently outside their target range. */
export const offTargetFeatures = (
  features: MouthFeatures,
  targets: TargetMap,
): MouthFeatureName[] => {
  const off: MouthFeatureName[] = [];
  for (const [name, range] of Object.entries(targets) as [
    MouthFeatureName,
    { min?: number; max?: number },
  ][]) {
    const value = features[name];
    if (
      (range.min !== undefined && value < range.min) ||
      (range.max !== undefined && value > range.max)
    ) {
      off.push(name);
    }
  }
  return off;
};

/** Arrow text for the first off-target feature: which way to move. */
export const directionHint = (
  features: MouthFeatures,
  targets: TargetMap,
  labels: Record<MouthFeatureName, string>,
): string | null => {
  const [first] = offTargetFeatures(features, targets);
  if (!first) return null;
  const range = targets[first];
  if (range?.min !== undefined && features[first] < range.min)
    return `${labels[first]}: ${getCopy().mirror.increase}`;
  return `${labels[first]}: ${getCopy().mirror.decrease}`;
};

/** API targets (`{name: {min?, max?}}`) narrowed to known feature names. */
export const targetsFromApi = (raw: Record<string, Record<string, number>>): TargetMap => {
  const targets: TargetMap = {};
  for (const [name, range] of Object.entries(raw)) {
    targets[name as MouthFeatureName] = { min: range.min, max: range.max };
  }
  return targets;
};
