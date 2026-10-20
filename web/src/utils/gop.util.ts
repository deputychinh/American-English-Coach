import { SCORE_NEG_INF } from '@/constants/scoring.constant';
import type { PhoneInventory, PhoneSegment, PosteriorMatrix } from '@/interfaces/scoring.interface';
import { arpabetVariants } from '@/utils/phoneme.util';

/** Goodness of Pronunciation from CTC posteriors (port of backend gop_scorer.py). */

/** A label state may be entered from the label two states back (the blank between is skipped). */
const SKIP = 2;

/** Python `round(x, 3)` on the exact binary value (ties practically never occur for GOPs). */
export const round3 = (value: number): number => Number(value.toFixed(3)) + 0;

const mean = (values: Float64Array, start: number, end: number): number => {
  let sum = 0;
  for (let index = start; index < end; index += 1) sum += values[index] ?? 0;
  return sum / Math.max(1, end - start);
};

const column = (matrix: PosteriorMatrix, index: number): Float64Array => {
  const out = new Float64Array(matrix.frames);
  for (let t = 0; t < matrix.frames; t += 1) out[t] = matrix.data[t * matrix.vocab + index] ?? 0;
  return out;
};

/** Per-frame log probability of each phone = log-sum-exp over its token variants. */
const mergedLogProbs = (
  matrix: PosteriorMatrix,
  columns: Map<string, number[]>,
): Map<string, Float64Array> => {
  const merged = new Map<string, Float64Array>();
  for (const [symbol, indices] of columns) {
    const out = new Float64Array(matrix.frames);
    for (let t = 0; t < matrix.frames; t += 1) {
      const row = t * matrix.vocab;
      let peak = -Infinity;
      for (const index of indices) peak = Math.max(peak, matrix.data[row + index] ?? -Infinity);
      let sum = 0;
      for (const index of indices) sum += Math.exp((matrix.data[row + index] ?? 0) - peak);
      out[t] = peak + Math.log(sum);
    }
    merged.set(symbol, out);
  }
  return merged;
};

/** CTC forced alignment over `blank p1 blank p2 … blank`; frame span per label. */
const viterbiSpans = (emissions: Float64Array[], frames: number): [number, number][] => {
  const labels = emissions.length - 1;
  const states = 2 * labels + 1;
  const score = new Float64Array(frames * states).fill(SCORE_NEG_INF);
  const back = new Int32Array(frames * states);
  const emissionOf = Array.from({ length: states }, (_, s) => (s % 2 === 0 ? 0 : (s + 1) / 2));
  const emit = (t: number, s: number): number => emissions[emissionOf[s] ?? 0]?.[t] ?? 0;
  score[0] = emit(0, 0);
  if (states > 1) score[1] = emit(0, 1);
  for (let t = 1; t < frames; t += 1) {
    for (let s = 0; s < states; s += 1) {
      // Python `max` over (score, state) tuples: on equal scores the larger state wins.
      let bestScore = score[(t - 1) * states + s] ?? SCORE_NEG_INF;
      let bestState = s;
      const consider = (from: number): void => {
        const candidate = score[(t - 1) * states + from] ?? SCORE_NEG_INF;
        if (candidate > bestScore || (candidate === bestScore && from > bestState)) {
          bestScore = candidate;
          bestState = from;
        }
      };
      if (s >= 1) consider(s - 1);
      if (s >= SKIP && s % 2 === 1) consider(s - SKIP);
      score[t * states + s] = bestScore + emit(t, s);
      back[t * states + s] = bestState;
    }
  }
  const last = (frames - 1) * states;
  let state =
    states === 1
      ? 0
      : (score[last + states - 1] ?? 0) >= (score[last + states - 2] ?? 0)
        ? states - 1
        : states - 2;
  const path = [state];
  for (let t = frames - 1; t > 0; t -= 1) {
    state = back[t * states + state] ?? 0;
    path.push(state);
  }
  path.reverse();
  const spans: [number, number][] = [];
  for (let label = 1; label <= labels; label += 1) {
    const target = 2 * label - 1;
    const first = path.indexOf(target);
    if (first >= 0) {
      spans.push([first, path.lastIndexOf(target) + 1]);
    } else {
      const anchor = spans.at(-1)?.[1] ?? 0;
      spans.push([anchor, Math.min(anchor + 1, path.length)]);
    }
  }
  return spans;
};

/** Scorer bound to the model vocabulary: merges tokens into phones and scores expectations. */
export const createGopScorer = (
  vocab: Record<string, number>,
  blankId: number,
  inventory: PhoneInventory,
): ((matrix: PosteriorMatrix, expected: string[]) => PhoneSegment[]) => {
  const columns = new Map<string, number[]>();
  for (const symbol of inventory.order) {
    const indices = arpabetVariants(symbol, inventory)
      .map((token) => vocab[token])
      .filter((index): index is number => index !== undefined);
    if (indices.length > 0) columns.set(symbol, indices);
  }
  return (matrix, expected) => {
    if (expected.length === 0 || matrix.frames === 0) return [];
    const merged = mergedLogProbs(matrix, columns);
    const blank = column(matrix, blankId);
    const emissions = [blank, ...expected.map((symbol) => merged.get(symbol) ?? blank)];
    const spans = viterbiSpans(emissions, matrix.frames);
    // The blank competes too, so a phone forced into silence cannot score well.
    const competitor = new Float64Array(matrix.frames);
    for (let t = 0; t < matrix.frames; t += 1) {
      let best = blank[t] ?? SCORE_NEG_INF;
      for (const values of merged.values()) best = Math.max(best, values[t] ?? SCORE_NEG_INF);
      competitor[t] = best;
    }
    return expected.map((symbol, index) => {
      const [start, end] = spans[index] ?? [0, 0];
      const target = mean(emissions[index + 1] ?? blank, start, end);
      const best = mean(competitor, start, end);
      const gop = symbol === inventory.unknown ? 0 : Math.min(0, target - best);
      return { symbol, startFrame: start, endFrame: end, gop: round3(gop) };
    });
  };
};
