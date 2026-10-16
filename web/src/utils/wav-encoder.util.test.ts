import { concatChunks, encodeWav, resample, rmsLevel } from './wav-encoder.util';

const header = async (blob: Blob): Promise<DataView> => new DataView(await blob.arrayBuffer());

describe('wav encoder', () => {
  it('writes a valid 16 kHz mono PCM16 RIFF header', async () => {
    const samples = new Float32Array([0, 0.5, -0.5, 1, -1, 2]);
    const blob = encodeWav(samples);
    expect(blob.type).toBe('audio/wav');
    expect(blob.size).toBe(44 + samples.length * 2);
    const view = await header(blob);
    expect(String.fromCharCode(view.getUint8(0), view.getUint8(1))).toBe('RI');
    expect(view.getUint32(24, true)).toBe(16_000);
    expect(view.getUint16(22, true)).toBe(1);
    expect(view.getUint16(34, true)).toBe(16);
    expect(view.getInt16(44, true)).toBe(0);
    expect(view.getInt16(46, true)).toBe(Math.round(0.5 * 0x7fff));
    expect(view.getInt16(52, true)).toBe(-0x8000);
    expect(view.getInt16(54, true)).toBe(0x7fff); // clipped
  });

  it('resamples by linear interpolation and keeps the length ratio', () => {
    const input = new Float32Array(48_000).map((_, i) => Math.sin(i / 10));
    const output = resample(input, 48_000, 16_000);
    expect(output.length).toBe(16_000);
    expect(output[0]).toBeCloseTo(input[0] ?? 0);
    expect(resample(input, 16_000, 16_000)).toBe(input);
    expect(resample(new Float32Array(0), 48_000).length).toBe(0);
  });

  it('concatenates chunks and measures RMS', () => {
    const joined = concatChunks([new Float32Array([1, 1]), new Float32Array([-1])]);
    expect(Array.from(joined)).toEqual([1, 1, -1]);
    expect(rmsLevel(joined)).toBeCloseTo(1);
    expect(rmsLevel(new Float32Array(0))).toBe(0);
  });
});
