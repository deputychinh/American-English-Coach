import {
  FLUENCY_MIN_DIP_DB,
  FLUENCY_MIN_PAUSE_SECONDS,
  FLUENCY_MIN_SPEECH_DB,
  FLUENCY_SILENCE_DB,
  FLUENCY_SMOOTH_FRAMES,
  FLUENCY_VOICING_CORRELATION,
  FLUENCY_WINDOW,
} from '@/constants/fluency.constant';
import { PITCH_FRAME, PITCH_HOP, PITCH_SAMPLE_RATE } from '@/constants/scoring.constant';
import type { FluencyChange, FluencyMetrics, FluencyRound } from '@/interfaces/fluency.interface';

/**
 * Fluency from the audio alone, on the device: syllable nuclei are voiced intensity peaks with a
 * dip on both sides (de Jong & Wempe 2009), pauses are silences of 250 ms or more. No text and
 * no model are needed, so free speech can be measured in every build. The numbers compare a
 * learner with themselves only; they are not a level.
 */

const FRAME_SECONDS = PITCH_HOP / PITCH_SAMPLE_RATE;
const MIN_LAG = Math.floor(PITCH_SAMPLE_RATE / 400);
const MAX_LAG = Math.ceil(PITCH_SAMPLE_RATE / 75);

const EMPTY: FluencyMetrics = {
  speakingSeconds: 0,
  phonationSeconds: 0,
  syllables: 0,
  pauses: 0,
  speechRate: 0,
  articulationRate: 0,
  meanLengthOfRun: 0,
  pausesPerMinute: 0,
  meanPauseSeconds: 0,
};

/** Intensity in dBFS per 10 ms frame over a short window, so neighbouring syllables stay apart. */
const decibels = (samples: Float32Array): Float64Array => {
  const frames = Math.floor(samples.length / PITCH_HOP);
  const half = FLUENCY_WINDOW / 2;
  return Float64Array.from({ length: frames }, (_, frame) => {
    const centre = frame * PITCH_HOP + PITCH_HOP / 2;
    const from = Math.max(0, centre - half);
    const to = Math.min(samples.length, centre + half);
    let sum = 0;
    for (let i = from; i < to; i += 1) sum += (samples[i] ?? 0) ** 2;
    return 10 * Math.log10(Math.max(sum / Math.max(1, to - from), 1e-12));
  });
};

const smooth = (values: Float64Array, radius: number): Float64Array =>
  values.map((_, index) => {
    const from = Math.max(0, index - radius);
    const to = Math.min(values.length - 1, index + radius);
    let sum = 0;
    for (let i = from; i <= to; i += 1) sum += values[i] ?? 0;
    return sum / (to - from + 1);
  });

const quantile = (values: Float64Array, share: number): number => {
  const sorted = Float64Array.from(values).sort();
  return sorted[Math.min(sorted.length - 1, Math.floor(share * sorted.length))] ?? -Infinity;
};

/** Normalised autocorrelation at the best lag for 75–400 Hz around one frame. */
export const voicingAt = (samples: Float32Array, frame: number): number => {
  const start = Math.max(0, frame * PITCH_HOP - PITCH_FRAME / 2);
  const window = samples.subarray(start, Math.min(samples.length, start + PITCH_FRAME));
  const width = window.length - MAX_LAG;
  if (width <= 0) return 0;
  let best = 0;
  for (let lag = MIN_LAG; lag <= MAX_LAG; lag += 1) {
    let cross = 0;
    let energyA = 0;
    let energyB = 0;
    for (let i = 0; i < width; i += 1) {
      const a = window[i] ?? 0;
      const b = window[i + lag] ?? 0;
      cross += a * b;
      energyA += a * a;
      energyB += b * b;
    }
    if (energyA > 0 && energyB > 0) best = Math.max(best, cross / Math.sqrt(energyA * energyB));
  }
  return best;
};

/** Sounding stretches as [first, last] frame pairs, split where silence lasts a pause or more. */
const soundingRuns = (isSound: boolean[], first: number, last: number): [number, number][] => {
  const minPause = Math.round(FLUENCY_MIN_PAUSE_SECONDS / FRAME_SECONDS);
  const runs: [number, number][] = [];
  let runStart = first;
  let silentSince: number | null = null;
  for (let frame = first; frame <= last; frame += 1) {
    if (isSound[frame]) {
      if (silentSince !== null && frame - silentSince >= minPause) {
        runs.push([runStart, silentSince - 1]);
        runStart = frame;
      }
      silentSince = null;
    } else {
      silentSince ??= frame;
    }
  }
  runs.push([runStart, last]);
  return runs;
};

/** Intensity peaks above the silence line, merged unless a dip of 2 dB separates them. */
const syllablePeaks = (db: Float64Array, threshold: number, [first, last]: number[]): number[] => {
  const kept: number[] = [];
  for (let frame = Math.max(1, first ?? 0); frame < (last ?? 0); frame += 1) {
    const value = db[frame] ?? -Infinity;
    const isPeak = value > (db[frame - 1] ?? -Infinity) && value >= (db[frame + 1] ?? -Infinity);
    if (!isPeak || value <= threshold) continue;
    const previous = kept.at(-1);
    if (previous === undefined) {
      kept.push(frame);
      continue;
    }
    let dip = Infinity;
    for (let i = previous; i <= frame; i += 1) dip = Math.min(dip, db[i] ?? Infinity);
    const lower = Math.min(db[previous] ?? -Infinity, value);
    if (lower - dip >= FLUENCY_MIN_DIP_DB) kept.push(frame);
    else if (value > (db[previous] ?? -Infinity)) kept[kept.length - 1] = frame;
  }
  return kept;
};

const round = (value: number, digits = 1): number => {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
};

/** Speech rate, articulation rate, mean length of run and pauses of one take (16 kHz mono). */
export const analyzeFluency = (samples: Float32Array): FluencyMetrics => {
  const db = smooth(decibels(samples), FLUENCY_SMOOTH_FRAMES);
  const loudest = quantile(db, 0.99);
  if (db.length === 0 || loudest < FLUENCY_MIN_SPEECH_DB) return EMPTY;
  const threshold = loudest - FLUENCY_SILENCE_DB;
  const isSound = Array.from(db, (value) => value > threshold);
  const first = isSound.indexOf(true);
  const last = isSound.lastIndexOf(true);
  if (first < 0 || last <= first) return EMPTY;

  const runs = soundingRuns(isSound, first, last);
  const syllables = syllablePeaks(db, threshold, [first, last]).filter(
    (frame) => voicingAt(samples, frame) >= FLUENCY_VOICING_CORRELATION,
  );
  const speakingSeconds = (last - first + 1) * FRAME_SECONDS;
  const phonationSeconds =
    runs.reduce((sum, [start, end]) => sum + end - start + 1, 0) * FRAME_SECONDS;
  const pauses = runs.length - 1;
  const pauseSeconds = speakingSeconds - phonationSeconds;
  const runsWithSpeech = runs.filter(([start, end]) =>
    syllables.some((frame) => frame >= start && frame <= end),
  ).length;
  return {
    speakingSeconds: round(speakingSeconds, 2),
    phonationSeconds: round(phonationSeconds, 2),
    syllables: syllables.length,
    pauses,
    speechRate: round((syllables.length / speakingSeconds) * 60),
    articulationRate: round(syllables.length / phonationSeconds, 2),
    meanLengthOfRun: runsWithSpeech > 0 ? round(syllables.length / runsWithSpeech) : 0,
    pausesPerMinute: round((pauses / speakingSeconds) * 60),
    meanPauseSeconds: pauses > 0 ? round(pauseSeconds / pauses, 2) : 0,
  };
};

/** Last round against the first: positive speech rate and run length, fewer pauses = better. */
export const fluencyChange = (rounds: FluencyRound[]): FluencyChange | null => {
  const first = rounds[0]?.metrics;
  const last = rounds.at(-1)?.metrics;
  if (!first || !last || rounds.length < 2) return null;
  return {
    speechRate: round(last.speechRate - first.speechRate),
    meanLengthOfRun: round(last.meanLengthOfRun - first.meanLengthOfRun),
    pausesPerMinute: round(last.pausesPerMinute - first.pausesPerMinute),
  };
};
