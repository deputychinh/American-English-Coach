import { logSoftmaxRows, normaliseSamples, sha256Hex } from '@/utils/posteriors.util';

describe('posteriors util', () => {
  it('normalises samples to zero mean and unit variance', () => {
    const out = normaliseSamples(new Float32Array([1, 2, 3, 4]));
    const mean = out.reduce((sum, value) => sum + value, 0) / out.length;
    const variance = out.reduce((sum, value) => sum + (value - mean) ** 2, 0) / out.length;
    expect(mean).toBeCloseTo(0, 6);
    expect(variance).toBeCloseTo(1, 4);
  });

  it('leaves silence and empty input finite', () => {
    expect(normaliseSamples(new Float32Array(0))).toHaveLength(0);
    expect(Array.from(normaliseSamples(new Float32Array([0, 0])))).toEqual([0, 0]);
  });

  it('turns each row into log-probabilities', () => {
    const values = new Float32Array([1, 2, 3, 0, 0, 0]);
    logSoftmaxRows(values, 2, 3);
    for (const row of [0, 1]) {
      const total = [0, 1, 2].reduce((sum, c) => sum + Math.exp(values[row * 3 + c] ?? 0), 0);
      expect(total).toBeCloseTo(1, 5);
    }
    expect(values[3]).toBeCloseTo(Math.log(1 / 3), 5);
    expect(values[2]).toBeGreaterThan(values[0] ?? 0);
  });

  it('hashes bytes as hex SHA-256', async () => {
    expect(await sha256Hex(new TextEncoder().encode('abc'))).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });
});
