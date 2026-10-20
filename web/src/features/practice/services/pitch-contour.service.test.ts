import { encodeWav } from '@/utils/wav-encoder.util';

import { pitchContours, resetModelContours } from './pitch-contour.service';

const { fetchReferenceAudio } = vi.hoisted(() => ({ fetchReferenceAudio: vi.fn() }));
vi.mock('@/features/practice/services/assessment.service', () => ({ fetchReferenceAudio }));
vi.mock('@/features/practice/services/voice-library.service', () => ({
  bundledClipUrl: () => Promise.resolve(null),
}));

/** One second of a steady 160 Hz voice-like tone with a quiet lead-in. */
const tone = (): Float32Array =>
  Float32Array.from({ length: 16_000 }, (_, i) =>
    i < 2_000 ? 0 : 0.3 * Math.sin((2 * Math.PI * 160 * i) / 16_000),
  );

describe('pitch contours', () => {
  beforeEach(() => resetModelContours());

  it('draws the learner’s steady tone flat and has no model when the voice is unavailable', async () => {
    fetchReferenceAudio.mockRejectedValue(new Error('offline'));
    const { learner, model } = await pitchContours('Hello there.', encodeWav(tone()));
    expect(model).toBeNull();
    const voiced = learner.flatMap((point) => (point.st === null ? [] : [point.st]));
    expect(voiced.length).toBeGreaterThan(20);
    expect(Math.max(...voiced.map(Math.abs))).toBeLessThan(0.5);
    await pitchContours('Hello there.', encodeWav(tone()));
    expect(fetchReferenceAudio).toHaveBeenCalledTimes(1);
  });
});
