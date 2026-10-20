import { base64ToFloat32, float32ToBase64 } from './float32-base64.util';

describe('float32 base64', () => {
  it('round-trips samples exactly', () => {
    const samples = new Float32Array([0, 1, -1, 0.125, -3.5e-7, 1234.5]);
    expect(Array.from(base64ToFloat32(float32ToBase64(samples)))).toEqual(Array.from(samples));
  });

  it('handles long takes in chunks', () => {
    const samples = new Float32Array(16_000 * 3).map((_, index) => Math.sin(index / 10));
    expect(base64ToFloat32(float32ToBase64(samples))).toEqual(samples);
  });
});
