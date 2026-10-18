import type { VadEvent, VadOptions, VadState } from '@/interfaces/vad.interface';

/** Defaults tuned for one word or a short sentence spoken close to a phone microphone. */
export const VAD_DEFAULTS: VadOptions = {
  minThreshold: 0.015,
  noiseFactor: 3,
  speechMs: 120,
  silenceMs: 750,
  noSpeechMs: 5000,
  calibrationMs: 250,
};

export const initialVad = (now: number): VadState => ({
  startedAt: now,
  noiseFloor: 0,
  speechSince: null,
  lastVoiceAt: null,
  hasSpeech: false,
});

/**
 * One energy-based voice-activity step per audio chunk. The threshold follows the background
 * noise (an average of quiet chunks); speech needs `speechMs` above it, the utterance ends after
 * `silenceMs` below it, and nothing at all for `noSpeechMs` gives up.
 */
export const vadStep = (
  state: VadState,
  { level, now }: { level: number; now: number },
  options: VadOptions = VAD_DEFAULTS,
): { state: VadState; event: VadEvent } => {
  if (now - state.startedAt < options.calibrationMs) {
    const noiseFloor = state.noiseFloor === 0 ? level : (state.noiseFloor + level) / 2;
    return { state: { ...state, noiseFloor }, event: 'none' };
  }
  const threshold = Math.max(options.minThreshold, state.noiseFloor * options.noiseFactor);
  const isVoice = level > threshold;
  if (!isVoice) {
    const noiseFloor = state.noiseFloor === 0 ? level : state.noiseFloor * 0.95 + level * 0.05;
    const next = { ...state, noiseFloor, speechSince: state.hasSpeech ? state.speechSince : null };
    if (
      state.hasSpeech &&
      state.lastVoiceAt !== null &&
      now - state.lastVoiceAt >= options.silenceMs
    )
      return { state: next, event: 'end' };
    if (!state.hasSpeech && now - state.startedAt >= options.noSpeechMs)
      return { state: next, event: 'no-speech' };
    return { state: next, event: 'none' };
  }
  const speechSince = state.speechSince ?? now;
  const hasSpeech = state.hasSpeech || now - speechSince >= options.speechMs;
  const event = hasSpeech && !state.hasSpeech ? 'speech' : 'none';
  return { state: { ...state, speechSince, lastVoiceAt: now, hasSpeech }, event };
};
