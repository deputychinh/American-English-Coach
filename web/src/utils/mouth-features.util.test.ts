import type { Point3 } from '@/interfaces/mouth.interface';

import { poseFromMatrix, poseQuality, rawMouthFeatures } from './mouth-features.util';

const landmarks = (): Point3[] => {
  const points: Point3[] = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5, z: 0 }));
  points[33] = { x: 0.4, y: 0.4, z: 0 };
  points[263] = { x: 0.6, y: 0.4, z: 0 }; // eyes 0.2 apart
  points[13] = { x: 0.5, y: 0.58, z: 0 };
  points[14] = { x: 0.5, y: 0.62, z: 0 }; // aperture 0.04 → 0.2 of eye distance
  points[61] = { x: 0.45, y: 0.6, z: 0 };
  points[291] = { x: 0.55, y: 0.6, z: 0 }; // width 0.1 → 0.5
  return points;
};

describe('rawMouthFeatures', () => {
  it('normalises distances by the eye distance and reads blendshapes', () => {
    const features = rawMouthFeatures({
      landmarks: landmarks(),
      blendshapes: { mouthPucker: 0.8, mouthFunnel: 0.4, jawOpen: 0.3, mouthClose: 0.1 },
      pose: null,
    });
    expect(features).not.toBeNull();
    expect(features?.aperture).toBeCloseTo(0.2);
    expect(features?.width).toBeCloseTo(0.5);
    expect(features?.roundness).toBeCloseTo(0.6);
    expect(features?.jaw).toBeCloseTo(0.3);
    expect(features?.lipClosed).toBeCloseTo(0.1);
    expect(features?.lowerLipTuck).toBe(0);
  });

  it('returns null without the needed landmarks', () => {
    expect(rawMouthFeatures({ landmarks: [], blendshapes: {}, pose: null })).toBeNull();
  });
});

describe('pose', () => {
  it('reads yaw and pitch from an identity matrix as zero', () => {
    const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    expect(poseFromMatrix(identity)).toEqual({ yawDegrees: 0, pitchDegrees: -0 });
    expect(poseFromMatrix([1, 2])).toBeNull();
  });

  it('degrades quality past the limits only', () => {
    expect(poseQuality(null)).toBe(1);
    expect(poseQuality({ yawDegrees: 10, pitchDegrees: 5 })).toBe(1);
    expect(poseQuality({ yawDegrees: 30, pitchDegrees: 0 })).toBeCloseTo(0.5);
    expect(poseQuality({ yawDegrees: 0, pitchDegrees: 45 })).toBe(0);
  });
});
