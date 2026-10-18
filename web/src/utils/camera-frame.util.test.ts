import { describe, expect, it } from 'vitest';

import { coverFrame, mouthZoom } from '@/utils/camera-frame.util';

const mouth = (cx: number, cy: number, half = 0.06) => [
  { x: cx - half, y: cy },
  { x: cx + half, y: cy },
  { x: cx, y: cy - 0.02 },
  { x: cx, y: cy + 0.02 },
];

describe('coverFrame', () => {
  it('fills the width of a wide preview with a portrait camera', () => {
    expect(coverFrame({ width: 360, height: 220 }, 9 / 16)).toEqual({ width: 360, height: 640 });
  });

  it('fills the height of a tall stage with a landscape camera', () => {
    const frame = coverFrame({ width: 390, height: 700 }, 16 / 9);
    expect(frame.height).toBeCloseTo(700);
    expect(frame.width).toBeCloseTo(1244.4, 1);
  });
});

describe('mouthZoom', () => {
  const stage = { width: 360, height: 220 };
  const frame = coverFrame(stage, 9 / 16);

  it('zooms until the mouth spans the target share and centres it', () => {
    const zoom = mouthZoom({ outline: mouth(0.5, 0.5), stage, frame });
    expect(zoom).not.toBeNull();
    // 0.12 × 360 = 43 px wide; 42 % of 360 is 151 px → ×3.5 (the cap).
    expect(zoom?.scale).toBe(3.5);
    expect(zoom?.x).toBe(0);
    expect(zoom?.y).toBe(0);
  });

  it('pans the mirrored mouth towards the middle without showing an edge', () => {
    // Mouth low and to the camera's left (shown on the right after mirroring).
    const zoom = mouthZoom({ outline: mouth(0.3, 0.7, 0.15), stage, frame });
    expect(zoom?.scale).toBe(1.4);
    // Mirrored x is 0.7 of the width → pan left; the pan never exceeds the spare width.
    expect(zoom?.x).toBeLessThan(0);
    expect(Math.abs(zoom?.x ?? 0)).toBeLessThanOrEqual((1.4 * frame.width - stage.width) / 2);
    expect(zoom?.y).toBeLessThan(0);
  });

  it('ignores an outline too small to place', () => {
    expect(mouthZoom({ outline: [{ x: 0.5, y: 0.5 }], stage, frame })).toBeNull();
  });
});
