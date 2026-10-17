import type { MouthFeatureName, MouthFeatures, TargetMap } from '@/interfaces/mouth.interface';

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

/** API targets (`{name: {min?, max?}}`) narrowed to known feature names. */
export const targetsFromApi = (raw: Record<string, Record<string, number>>): TargetMap => {
  const targets: TargetMap = {};
  for (const [name, range] of Object.entries(raw)) {
    targets[name as MouthFeatureName] = { min: range.min, max: range.max };
  }
  return targets;
};
