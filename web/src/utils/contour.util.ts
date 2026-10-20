import {
  CONTOUR_ENDING_SHARE,
  CONTOUR_ENDING_ST,
  CONTOUR_POINTS,
  CONTOUR_RANGE_ST,
} from '@/constants/contour.constant';
import type { ContourEnding, ContourPoint } from '@/interfaces/contour.interface';
import { semitones } from '@/utils/prosody.util';

const clamp = (value: number): number =>
  Math.max(-CONTOUR_RANGE_ST, Math.min(CONTOUR_RANGE_ST, value));

/**
 * A drawable pitch contour from an f0 track (Hz, NaN when unvoiced): trimmed to the voiced
 * stretch so two speakers share one time axis, in semitones from each speaker's own median so a
 * low and a high voice compare by shape, averaged into at most `points` buckets.
 */
export const pitchContour = (f0: Float64Array, points = CONTOUR_POINTS): ContourPoint[] => {
  const voiced = [...f0.keys()].filter((index) => !Number.isNaN(f0[index] ?? Number.NaN));
  const first = voiced[0];
  const last = voiced.at(-1);
  if (first === undefined || last === undefined || voiced.length < 3) return [];
  const span = semitones(f0.subarray(first, last + 1));
  const count = Math.min(points, span.length);
  return Array.from({ length: count }, (_, bucket) => {
    const start = Math.floor((bucket * span.length) / count);
    const end = Math.max(start + 1, Math.floor(((bucket + 1) * span.length) / count));
    const values = [...span.subarray(start, end)].filter((value) => !Number.isNaN(value));
    const st = values.length ? clamp(values.reduce((sum, v) => sum + v, 0) / values.length) : null;
    return { t: count === 1 ? 0 : bucket / (count - 1), st };
  });
};

/** Rise, fall or level over the last fifth of the contour (its voiced points only). */
export const contourEnding = (contour: ContourPoint[]): ContourEnding | null => {
  const tail = contour.filter((point) => point.t >= 1 - CONTOUR_ENDING_SHARE && point.st !== null);
  const head = tail[0]?.st;
  const end = tail.at(-1)?.st;
  if (tail.length < 2 || head === null || head === undefined || end === null || end === undefined)
    return null;
  if (end - head >= CONTOUR_ENDING_ST) return 'rise';
  if (head - end >= CONTOUR_ENDING_ST) return 'fall';
  return 'level';
};

/** SVG path for a contour in a `width`×`height` box; unvoiced gaps lift the pen. */
export const contourPath = (
  contour: ContourPoint[],
  box: { width: number; height: number },
): string => {
  let path = '';
  let isDown = false;
  for (const point of contour) {
    if (point.st === null) {
      isDown = false;
      continue;
    }
    const x = (point.t * box.width).toFixed(1);
    const y = ((1 - (point.st + CONTOUR_RANGE_ST) / (2 * CONTOUR_RANGE_ST)) * box.height).toFixed(
      1,
    );
    path += `${isDown ? 'L' : 'M'}${x} ${y} `;
    isDown = true;
  }
  return path.trim();
};
