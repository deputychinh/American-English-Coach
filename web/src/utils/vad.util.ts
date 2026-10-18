import { VAD_DEFAULTS } from '@/constants/recorder.constant';
import type { VadEvent, VadOptions, VadState } from '@/interfaces/vad.interface';

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
    // The quietest chunk is the room: speaking right away must not raise the threshold.
    const noiseFloor = state.noiseFloor === 0 ? level : Math.min(state.noiseFloor, level);
    return { state: { ...state, noiseFloor }, event: 'none' };
  }
  const threshold = Math.min(
    options.maxThreshold,
    Math.max(options.minThreshold, state.noiseFloor * options.noiseFactor),
  );
  const isVoice = level > threshold;
  if (!isVoice) {
    const noiseFloor = state.noiseFloor === 0 ? level : state.noiseFloor * 0.95 + level * 0.05;
    // Short dips inside a word (a few milliseconds per chunk) do not break the onset.
    const isGap =
      !state.hasSpeech &&
      state.lastVoiceAt !== null &&
      now - state.lastVoiceAt <= options.hangoverMs;
    const next = {
      ...state,
      noiseFloor,
      speechSince: state.hasSpeech || isGap ? state.speechSince : null,
    };
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
