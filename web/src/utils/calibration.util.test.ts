import type { MouthFeatures } from '@/interfaces/mouth.interface';

import {
  calibrationFromPayload,
  calibrationFromSamples,
  calibrationToPayload,
  normaliseFeatures,
} from './calibration.util';

const sample = (overrides: Partial<MouthFeatures>): MouthFeatures => ({
  aperture: 0.1,
  width: 0.5,
  roundness: 0.2,
  jaw: 0.1,
  lipClosed: 0,
  lowerLipTuck: 0,
  teethVisible: 0,
  tongueVisible: 0,
  ...overrides,
});

describe('calibration util', () => {
  const calibration = calibrationFromSamples([
    sample({}),
    sample({ aperture: 0.5, jaw: 0.9 }),
    sample({ width: 0.9, roundness: 0.8 }),
  ]);

  it('derives min/max per feature and round-trips the API payload', () => {
    expect(calibration).not.toBeNull();
    expect(calibration?.aperture).toEqual({ min: 0.1, max: 0.5 });
    expect(calibration?.width).toEqual({ min: 0.5, max: 0.9 });
    expect(calibrationFromSamples([])).toBeNull();
    const payload = calibrationToPayload(calibration ?? ({} as never));
    expect(calibrationFromPayload(payload)).toEqual(calibration);
    expect(calibrationFromPayload(null)).toBeNull();
    expect(calibrationFromPayload({ aperture: { min: 0 } })).toBeNull();
  });

  it('normalises into 0..1, blends roundness with narrowness and derives lipClosed', () => {
    if (!calibration) throw new Error('calibration');
    const open = normaliseFeatures(sample({ aperture: 0.5, jaw: 0.9 }), calibration);
    expect(open.aperture).toBe(1);
    expect(open.jaw).toBe(1);
    expect(open.lipClosed).toBe(0);
    const closed = normaliseFeatures(sample({ aperture: 0.1, width: 0.5 }), calibration);
    expect(closed.aperture).toBe(0);
    expect(closed.lipClosed).toBe(1);
    expect(closed.roundness).toBeCloseTo(0.5); // width at its min counts as narrow
    expect(closed.lowerLipTuck).toBe(0); // degenerate range → 0
  });
});
