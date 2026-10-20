import { TARGET_SAMPLE_RATE } from '@/constants/recorder.constant';

/** Linear resampling (enough for speech at 44.1/48 kHz → 16 kHz after the browser's low-pass). */
export const resample = (
  input: Float32Array,
  fromRate: number,
  toRate: number = TARGET_SAMPLE_RATE,
): Float32Array => {
  if (fromRate === toRate || input.length === 0) return input;
  const ratio = fromRate / toRate;
  const length = Math.floor(input.length / ratio);
  const output = new Float32Array(length);
  for (let index = 0; index < length; index += 1) {
    const position = index * ratio;
    const left = Math.floor(position);
    const right = Math.min(left + 1, input.length - 1);
    const weight = position - left;
    output[index] = (input[left] ?? 0) * (1 - weight) + (input[right] ?? 0) * weight;
  }
  return output;
};

/** Concatenates recorder chunks into one buffer. */
export const concatChunks = (chunks: Float32Array[]): Float32Array => {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const output = new Float32Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }
  return output;
};

const writeAscii = (view: DataView, offset: number, text: string): void => {
  for (let index = 0; index < text.length; index += 1) {
    view.setUint8(offset + index, text.charCodeAt(index));
  }
};

/** 16-bit PCM mono WAV (RIFF) from float samples in [-1, 1]. */
export const encodeWav = (samples: Float32Array, sampleRate: number = TARGET_SAMPLE_RATE): Blob => {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeAscii(view, 8, 'WAVE');
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, 'data');
  view.setUint32(40, samples.length * 2, true);
  let offset = 44;
  for (const sample of samples) {
    const clamped = Math.max(-1, Math.min(1, sample));
    view.setInt16(offset, Math.round(clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff), true);
    offset += 2;
  }
  return new Blob([buffer], { type: 'audio/wav' });
};

/** Root-mean-square level of a chunk, for the level meter. */
export const rmsLevel = (chunk: Float32Array): number => {
  if (chunk.length === 0) return 0;
  let sum = 0;
  for (const sample of chunk) sum += sample * sample;
  return Math.sqrt(sum / chunk.length);
};

/**
 * 16-bit PCM WAV → samples in [-1, 1), divided by 32768 like the server's decoder (soundfile),
 * so a take scored on the device sees the same numbers as one scored by the API.
 */
export const decodeWav = (buffer: ArrayBuffer): Float32Array => {
  const view = new DataView(buffer);
  let offset = 12;
  while (offset + 8 <= view.byteLength) {
    const id = String.fromCharCode(
      view.getUint8(offset),
      view.getUint8(offset + 1),
      view.getUint8(offset + 2),
      view.getUint8(offset + 3),
    );
    const size = view.getUint32(offset + 4, true);
    if (id === 'data') {
      const count = Math.floor(Math.min(size, view.byteLength - offset - 8) / 2);
      const samples = new Float32Array(count);
      for (let index = 0; index < count; index += 1) {
        samples[index] = view.getInt16(offset + 8 + index * 2, true) / 0x8000;
      }
      return samples;
    }
    offset += 8 + size + (size % 2);
  }
  return new Float32Array(0);
};
