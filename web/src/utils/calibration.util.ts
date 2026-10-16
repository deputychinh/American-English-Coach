import { FEATURE_NAMES } from '@/constants/mirror.constant';
import type {
  Calibration,
  FeatureRange,
  MouthFeatureName,
  MouthFeatures,
} from '@/interfaces/mouth.interface';

const EPSILON = 1e-3;

/** Min/max per feature over every sample captured during the calibration steps. */
export const calibrationFromSamples = (samples: MouthFeatures[]): Calibration | null => {
  if (samples.length === 0) return null;
  const entries = FEATURE_NAMES.map((name): [MouthFeatureName, FeatureRange] => {
    const values = samples.map((sample) => sample[name]);
    return [name, { min: Math.min(...values), max: Math.max(...values) }];
  });
  return Object.fromEntries(entries) as Calibration;
};

/** Maps raw features onto 0..1 using the personal ranges; degenerate ranges give 0. */
export const normaliseFeatures = (raw: MouthFeatures, calibration: Calibration): MouthFeatures => {
  const normalised = { ...raw };
  for (const name of FEATURE_NAMES) {
    const { min, max } = calibration[name];
    const span = max - min;
    normalised[name] = span < EPSILON ? 0 : Math.min(1, Math.max(0, (raw[name] - min) / span));
  }
  // Rounded lips also show as a narrower mouth; blend both cues (plan §4.1).
  normalised.roundness = Math.min(1, (normalised.roundness + (1 - normalised.width)) / 2);
  // Closed lips: the model's mouthClose plus a near-zero aperture.
  normalised.lipClosed = Math.max(normalised.lipClosed, 1 - Math.min(1, normalised.aperture * 4));
  return normalised;
};

/** API payload shape (`features: {name: {min, max}}`) ↔ typed calibration. */
export const calibrationToPayload = (
  calibration: Calibration,
): Record<string, Record<string, number>> =>
  Object.fromEntries(FEATURE_NAMES.map((name) => [name, { ...calibration[name] }]));

export const calibrationFromPayload = (
  payload: Record<string, Record<string, number>> | null | undefined,
): Calibration | null => {
  if (!payload) return null;
  const entries: [MouthFeatureName, FeatureRange][] = [];
  for (const name of FEATURE_NAMES) {
    const range = payload[name];
    if (!range || typeof range.min !== 'number' || typeof range.max !== 'number') return null;
    entries.push([name, { min: range.min, max: range.max }]);
  }
  return Object.fromEntries(entries) as Calibration;
};
