import {
  PITCH_FMAX,
  PITCH_FMIN,
  PITCH_FRAME,
  PITCH_HOP,
  PITCH_SAMPLE_RATE,
} from '@/constants/scoring.constant';
import type { ProsodyTracks } from '@/interfaces/scoring.interface';

/**
 * Pitch and energy tracks on the device. Energy matches librosa's RMS exactly (centred frames of
 * 1024 with zero padding, hop 160). Pitch uses YIN (de Cheveigné & Kawahara 2002) instead of the
 * server's pYIN; src/data/scoring/prosody-golden.json checks the two agree.
 */

/**
 * CMND below this marks a frame voiced. Tuned on prosody-golden.json against pYIN: 0.35 keeps
 * 97.9% of shared frames within half a semitone and all 25 findings (0.15 lost 2 of 25).
 */
const YIN_THRESHOLD = 0.35;
/** Frames quieter than this share of the loudest frame are unvoiced (breath, room noise). */
const VOICING_ENERGY_SHARE = 0.02;

const padded = (samples: Float32Array): Float32Array => {
  const half = PITCH_FRAME / 2;
  const out = new Float32Array(samples.length + PITCH_FRAME);
  out.set(samples, half);
  return out;
};

const frameCount = (samples: Float32Array): number => 1 + Math.floor(samples.length / PITCH_HOP);

/** librosa.feature.rms(frame_length=1024, hop_length=160, center=True, pad_mode='constant'). */
export const rmsTrack = (samples: Float32Array): Float64Array => {
  const signal = padded(samples);
  const frames = frameCount(samples);
  const out = new Float64Array(frames);
  for (let frame = 0; frame < frames; frame += 1) {
    const start = frame * PITCH_HOP;
    let sum = 0;
    for (let index = start; index < start + PITCH_FRAME; index += 1) {
      const value = signal[index] ?? 0;
      sum += value * value;
    }
    out[frame] = Math.sqrt(sum / PITCH_FRAME);
  }
  return out;
};

/** YIN f0 per frame (Hz), NaN when unvoiced or too quiet. */
export const yinTrack = (samples: Float32Array, rms: Float64Array): Float64Array => {
  const signal = padded(samples);
  const frames = frameCount(samples);
  const tauMin = Math.floor(PITCH_SAMPLE_RATE / PITCH_FMAX);
  const tauMax = Math.ceil(PITCH_SAMPLE_RATE / PITCH_FMIN);
  const width = PITCH_FRAME - tauMax;
  const loudest = Math.max(...rms);
  const difference = new Float64Array(tauMax + 2);
  const out = new Float64Array(frames).fill(Number.NaN);
  for (let frame = 0; frame < frames; frame += 1) {
    if ((rms[frame] ?? 0) < loudest * VOICING_ENERGY_SHARE) continue;
    const start = frame * PITCH_HOP;
    for (let tau = 1; tau <= tauMax + 1; tau += 1) {
      let sum = 0;
      for (let j = 0; j < width; j += 1) {
        const delta = (signal[start + j] ?? 0) - (signal[start + j + tau] ?? 0);
        sum += delta * delta;
      }
      difference[tau] = sum;
    }
    // Cumulative mean normalised difference; pick the first dip under the threshold.
    let running = 0;
    const cmnd = new Float64Array(tauMax + 2).fill(1);
    for (let tau = 1; tau <= tauMax + 1; tau += 1) {
      running += difference[tau] ?? 0;
      cmnd[tau] = running > 0 ? ((difference[tau] ?? 0) * tau) / running : 1;
    }
    let chosen = -1;
    for (let tau = tauMin; tau <= tauMax; tau += 1) {
      if ((cmnd[tau] ?? 1) < YIN_THRESHOLD) {
        while (tau + 1 <= tauMax && (cmnd[tau + 1] ?? 1) < (cmnd[tau] ?? 1)) tau += 1;
        chosen = tau;
        break;
      }
    }
    if (chosen < 0) continue;
    // Parabolic interpolation around the dip for sub-sample period.
    const before = cmnd[chosen - 1] ?? 1;
    const at = cmnd[chosen] ?? 1;
    const after = cmnd[chosen + 1] ?? 1;
    const curvature = before - 2 * at + after;
    const shift = curvature > 0 ? (0.5 * (before - after)) / curvature : 0;
    out[frame] = PITCH_SAMPLE_RATE / (chosen + shift);
  }
  return out;
};

/** Both tracks for 16 kHz mono audio, at 10 ms per frame like the server. */
export const prosodyTracks = (samples: Float32Array): ProsodyTracks => {
  const rms = rmsTrack(samples);
  return { f0: yinTrack(samples, rms), rms, hopSeconds: PITCH_HOP / PITCH_SAMPLE_RATE };
};
