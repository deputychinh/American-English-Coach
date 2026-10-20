import { MIN_VISEME_WINDOW_FRAMES } from '@/constants/scoring.constant';
import type { ScoringData, VisualVerdict } from '@/interfaces/scoring.interface';

/** Mouth-shape targets and the comparison with a window of features (backend viseme.py). */

type Visemes = ScoringData['visemes'];

/** Group of a sound; when a sound is listed twice the later group wins, as in Python. */
export const visemeGroupOf = (symbol: string, visemes: Visemes): string | null => {
  let found: string | null = null;
  for (const [group, data] of Object.entries(visemes.groups)) {
    if (data.sounds.includes(symbol)) found = group;
  }
  return found;
};

/** How well the camera sees a sound: high, medium or low ('low' when unseen). */
export const visemeConfidenceOf = (symbol: string, visemes: Visemes): string => {
  const group = visemeGroupOf(symbol, visemes);
  return group ? (visemes.groups[group]?.confidence ?? 'medium') : 'low';
};

/** `statistics.median`: the middle value, or the mean of the two middle values. */
export const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? (sorted[middle] ?? 0)
    : ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
};

/** Median features of a window compared with the sound's target ranges. */
export const evaluateViseme = (
  symbol: string,
  window: Record<string, number>[],
  visemes: Visemes,
): VisualVerdict => {
  const group = visemeGroupOf(symbol, visemes);
  if (group === null || window.length < MIN_VISEME_WINDOW_FRAMES) return 'unavailable';
  const medians: Record<string, number> = {};
  for (const name of visemes.features) {
    const values = window.map((frame) => frame[name]).filter((v): v is number => v !== undefined);
    if (values.length > 0) medians[name] = median(values);
  }
  if (Object.keys(medians).length === 0) return 'unavailable';
  const targets = visemes.groups[group]?.targets ?? {};
  const isOff = Object.entries(targets).some(([name, range]) => {
    const value = medians[name];
    if (value === undefined) return false;
    return (
      (range.min !== undefined && value < range.min) ||
      (range.max !== undefined && value > range.max)
    );
  });
  return isOff ? 'off' : 'ok';
};
