import { TARGET_SAMPLE_RATE } from '@/constants/recorder.constant';
import { fetchReferenceAudio } from '@/features/practice/services/assessment.service';
import { bundledClipUrl } from '@/features/practice/services/voice-library.service';
import type { ContourPoint, PitchContours } from '@/interfaces/contour.interface';
import { pitchContour } from '@/utils/contour.util';
import { prosodyTracks } from '@/utils/pitch.util';
import { decodeWav } from '@/utils/wav-encoder.util';

/** Model contours already measured this session, by text. */
const modelContours = new Map<string, ContourPoint[] | null>();

/** Any audio the platform decodes (AAC clips, server WAV), resampled to 16 kHz mono. */
const decodeAt16k = async (data: ArrayBuffer): Promise<Float32Array | null> => {
  if (typeof OfflineAudioContext === 'undefined') return null;
  const context = new OfflineAudioContext(1, 1, TARGET_SAMPLE_RATE);
  return (await context.decodeAudioData(data)).getChannelData(0);
};

const modelAudio = async (text: string): Promise<ArrayBuffer> => {
  const url = await bundledClipUrl(text);
  if (url) return (await fetch(url)).arrayBuffer();
  return (await fetchReferenceAudio(text)).arrayBuffer();
};

/** The model voice's contour, or null offline / without a clip (never throws). */
const modelContour = async (text: string): Promise<ContourPoint[] | null> => {
  if (modelContours.has(text)) return modelContours.get(text) ?? null;
  const contour = await modelAudio(text)
    .then(decodeAt16k)
    .then((samples) => (samples ? pitchContour(prosodyTracks(samples).f0) : null))
    .catch(() => null);
  modelContours.set(text, contour);
  return contour;
};

/** Learner and model contours for a sentence take (plan B3: shadowing). */
export const pitchContours = async (text: string, recording: Blob): Promise<PitchContours> => {
  const samples = decodeWav(await recording.arrayBuffer());
  const [learner, model] = await Promise.all([
    Promise.resolve(pitchContour(prosodyTracks(samples).f0)),
    modelContour(text),
  ]);
  return { learner, model };
};

/** Tests only. */
export const resetModelContours = (): void => {
  modelContours.clear();
};
