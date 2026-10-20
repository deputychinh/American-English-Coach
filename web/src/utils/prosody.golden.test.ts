import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { GoldenProsodyCase } from '@/interfaces/scoring.interface';

import { prosodyTracks, rmsTrack } from './pitch.util';
import { analyzeProsody } from './prosody.util';

// Real takes with the server's pYIN tracks and findings (backend/scripts/build_prosody_golden.py).

const RISE: Record<string, boolean | null> = {
  question: true,
  statement: false,
  wh_question: false,
  word: null,
};

const buffer = (base64: string): ArrayBuffer => {
  const bytes = Buffer.from(base64, 'base64');
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
};

const cases = (
  JSON.parse(readFileSync(join(process.cwd(), 'src/data/scoring/prosody-golden.json'), 'utf8')) as {
    cases: GoldenProsodyCase[];
  }
).cases;

const samplesOf = (c: GoldenProsodyCase): Float32Array =>
  Float32Array.from(new Int16Array(buffer(c.samples)), (v) => v / 32768);

describe('prosody agrees with the server', () => {
  it.each(cases.map((c) => [c.text, c] as const))('analyzer: %s', (_text, c) => {
    const f0 = new Float64Array(buffer(c.f0)).map((v) => (v === 0 ? Number.NaN : v));
    const findings = analyzeProsody(
      { f0, rms: new Float64Array(buffer(c.rms)), hopSeconds: 0.01 },
      { nuclei: c.nuclei, words: c.words, expectedRise: RISE[c.kind] ?? null },
    );
    expect(findings).toEqual(c.prosody);
  });

  it.each(cases.map((c) => [c.text, c] as const))('energy track: %s', (_text, c) => {
    const ours = rmsTrack(samplesOf(c));
    const theirs = new Float64Array(buffer(c.rms));
    expect(ours.length).toBe(theirs.length);
    ours.forEach((value, index) => expect(value).toBeCloseTo(theirs[index] ?? 0, 5));
  });

  it('YIN pitch stays within half a semitone of pYIN and keeps the verdicts', () => {
    let compared = 0;
    let close = 0;
    let verdictsSame = 0;
    let verdictsTotal = 0;
    for (const c of cases) {
      const tracks = prosodyTracks(samplesOf(c));
      const theirs = new Float64Array(buffer(c.f0));
      tracks.f0.forEach((ours, index) => {
        const reference = theirs[index] ?? 0;
        if (Number.isNaN(ours) || reference === 0) return;
        compared += 1;
        if (Math.abs(12 * Math.log2(ours / reference)) < 0.5) close += 1;
      });
      const findings = analyzeProsody(tracks, {
        nuclei: c.nuclei,
        words: c.words,
        expectedRise: RISE[c.kind] ?? null,
      });
      c.prosody.forEach((expected) => {
        verdictsTotal += 1;
        const mine = findings.find(
          (f) => f.aspect === expected.aspect && f.word_index === expected.word_index,
        );
        if (mine?.verdict === expected.verdict) verdictsSame += 1;
      });
    }
    expect(compared).toBeGreaterThan(500);
    expect(close / compared).toBeGreaterThanOrEqual(0.9);
    expect(verdictsSame / verdictsTotal).toBeGreaterThanOrEqual(0.95);
  });
});
