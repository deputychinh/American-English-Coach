import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type {
  GoldenScoringCase,
  PackedPosteriors,
  PosteriorMatrix,
} from '@/interfaces/scoring.interface';

import { assessLocally } from './local-assessment.service';
import { scoringData } from './scoring-data';

// Golden cases: real ONNX posteriors and the Python scorer's verdicts for them
// (backend/scripts/build_scoring_golden.py). The TypeScript scorer must agree on every phone.

const bytes = (base64: string): ArrayBuffer => {
  const buffer = Buffer.from(base64, 'base64');
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
};

/** Columns the scorer never reads sit far below any real log-probability. */
const unpack = (packed: PackedPosteriors): PosteriorMatrix => {
  const data = new Float32Array(packed.frames * packed.vocab).fill(-1e4);
  const values = new Float32Array(bytes(packed.values));
  const argmax = new Int32Array(bytes(packed.argmax));
  const argmaxValues = new Float32Array(bytes(packed.argmaxValues));
  for (let t = 0; t < packed.frames; t += 1) {
    packed.columns.forEach((column, index) => {
      data[t * packed.vocab + column] = values[t * packed.columns.length + index] ?? -1e4;
    });
    data[t * packed.vocab + (argmax[t] ?? 0)] = argmaxValues[t] ?? 0;
  }
  return { frames: packed.frames, vocab: packed.vocab, data };
};

const golden = JSON.parse(
  readFileSync(join(process.cwd(), 'src/data/scoring/golden.json'), 'utf8'),
) as { cases: GoldenScoringCase[] };

describe('in-app scorer agrees with the Python scorer', () => {
  it('has golden cases covering ok, check, error and the camera', () => {
    const verdicts = new Set(
      golden.cases.flatMap((c) => c.expected.words.flatMap((w) => w.phones.map((p) => p.verdict))),
    );
    expect([...verdicts].sort()).toEqual(['check', 'error', 'ok']);
    expect(golden.cases.length).toBeGreaterThanOrEqual(50);
  });

  it.each(golden.cases.map((c) => [c.text, c] as const))('%s', (_text, golden) => {
    const data = { ...scoringData(), enabled: golden.enabledErrors };
    const result = assessLocally(
      {
        itemId: golden.itemId,
        text: golden.text,
        kind: golden.kind,
        posteriors: unpack(golden.posteriors),
        mouthFrames: golden.mouthFrames,
        audioStartedAt: golden.audioStartedAt,
        modelVersion: 'w2v.mm8@onnx',
      },
      data,
    );
    expect(result.summary).toEqual(golden.expected.summary);
    expect(result.words.map((w) => [w.word, w.ipa])).toEqual(
      golden.expected.words.map((w) => [w.word, w.ipa]),
    );
    result.words.forEach((word, wordIndex) => {
      word.phones.forEach((phone, phoneIndex) => {
        const expected = golden.expected.words[wordIndex]?.phones[phoneIndex];
        expect({ ...phone, gop: 0 }).toEqual({ ...expected, gop: 0 });
        expect(Math.abs(phone.gop - (expected?.gop ?? 0))).toBeLessThanOrEqual(0.0015);
      });
    });
  });
});
