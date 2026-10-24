import { analyzeFluency, fluencyChange, voicingAt } from '@/utils/fluency.util';

const RATE = 16_000;

const silence = (seconds: number): number[] =>
  Array.from({ length: Math.round(seconds * RATE) }, () => 0);

/** A voiced vowel-like burst: five harmonics of 140 Hz under a Hann envelope. */
const syllable = (seconds = 0.18): number[] => {
  const length = Math.round(seconds * RATE);
  return Array.from({ length }, (_, i) => {
    const envelope = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (length - 1));
    let value = 0;
    for (let k = 1; k <= 5; k += 1) value += Math.sin((2 * Math.PI * 140 * k * i) / RATE) / k;
    return 0.25 * envelope * value;
  });
};

/** /s/-like noise: loud but unvoiced. */
const hiss = (seconds: number): number[] => {
  let seed = 7;
  return Array.from({ length: Math.round(seconds * RATE) }, () => {
    seed = (seed * 1_103_515_245 + 12_345) % 2_147_483_648;
    return 0.2 * (seed / 1_073_741_824 - 1);
  });
};

/** Syllables of one run with short gaps inside it (not pauses). */
const run = (count: number): number[] =>
  Array.from({ length: count }, (_, i) => [
    ...syllable(),
    ...(i < count - 1 ? silence(0.08) : []),
  ]).flat();

const take = (parts: number[][]): Float32Array => Float32Array.from(parts.flat());

describe('fluency util', () => {
  it('counts syllables, pauses and runs of a take with known silences', () => {
    const samples = take([
      silence(0.5),
      run(4),
      silence(0.6),
      run(6),
      silence(0.6),
      run(3),
      silence(0.5),
    ]);
    const metrics = analyzeFluency(samples);
    expect(metrics.syllables).toBe(13);
    expect(metrics.pauses).toBe(2);
    expect(metrics.meanLengthOfRun).toBeCloseTo(13 / 3, 1);
    // 3.14 s of sound and 1.2 s of pauses; the silence before and after is not speaking time.
    expect(metrics.speakingSeconds).toBeGreaterThan(4.1);
    expect(metrics.speakingSeconds).toBeLessThan(4.6);
    expect(metrics.phonationSeconds).toBeLessThan(metrics.speakingSeconds - 1);
    expect(metrics.meanPauseSeconds).toBeGreaterThan(0.45);
    expect(metrics.speechRate).toBeCloseTo((13 / metrics.speakingSeconds) * 60, 0);
    expect(metrics.articulationRate).toBeGreaterThan(metrics.speechRate / 60);
  });

  it('does not count a hiss as a syllable', () => {
    const samples = take([silence(0.3), run(3), silence(0.1), hiss(0.15), silence(0.3)]);
    expect(analyzeFluency(samples).syllables).toBe(3);
    expect(voicingAt(Float32Array.from(hiss(0.2)), 10)).toBeLessThan(0.45);
    expect(voicingAt(Float32Array.from(syllable(0.2)), 10)).toBeGreaterThan(0.9);
  });

  it('a faster take of the same syllables has a higher rate and no pause', () => {
    const slow = analyzeFluency(take([run(3), silence(0.6), run(3)]));
    const fast = analyzeFluency(take([run(6)]));
    expect(fast.speechRate).toBeGreaterThan(slow.speechRate);
    expect(fast.pauses).toBe(0);
    expect(fast.meanLengthOfRun).toBe(6);
    expect(slow.meanLengthOfRun).toBe(3);
  });

  it('measures nothing in silence or room noise', () => {
    expect(analyzeFluency(take([silence(1)])).syllables).toBe(0);
    expect(analyzeFluency(new Float32Array(0)).speechRate).toBe(0);
    const quietHiss = Float32Array.from(hiss(1), (value) => value * 0.001);
    expect(analyzeFluency(quietHiss).syllables).toBe(0);
  });

  it('compares the last round with the first', () => {
    const metrics = (speechRate: number, meanLengthOfRun: number, pausesPerMinute: number) => ({
      ...analyzeFluency(new Float32Array(0)),
      speechRate,
      meanLengthOfRun,
      pausesPerMinute,
    });
    const rounds = [
      { targetSeconds: 60, metrics: metrics(150, 4, 20) },
      { targetSeconds: 45, metrics: metrics(160, 5, 18) },
      { targetSeconds: 30, metrics: metrics(171.5, 6.2, 12) },
    ];
    expect(fluencyChange(rounds)).toEqual({
      speechRate: 21.5,
      meanLengthOfRun: 2.2,
      pausesPerMinute: -8,
    });
    expect(fluencyChange(rounds.slice(0, 1))).toBeNull();
  });
});
