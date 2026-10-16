import type { Point3 } from '@/interfaces/mouth.interface';

import { lipOutline, lipPolygons, medianOutline } from './lip-outline.util';

const face = (shift = 0): Point3[] => {
  const points: Point3[] = Array.from({ length: 478 }, (_, i) => ({
    x: (i % 20) / 40 + shift,
    y: (i % 7) / 10,
    z: 0,
  }));
  points[33] = { x: 0.3, y: 0.3, z: 0 };
  points[263] = { x: 0.7, y: 0.3, z: 0 };
  return points;
};

describe('lip outline', () => {
  it('centres and scales 40 points, invariant to translation', () => {
    const a = lipOutline(face());
    const b = lipOutline(face(0.25));
    expect(a).toHaveLength(40);
    a.forEach((point, index) => {
      expect(point.x).toBeCloseTo(b[index]?.x ?? NaN);
      expect(point.y).toBeCloseTo(b[index]?.y ?? NaN);
    });
    expect(lipOutline([])).toEqual([]);
  });

  it('takes the point-wise median across frames', () => {
    const a = lipOutline(face());
    const spiky = a.map((p) => ({ x: p.x + 5, y: p.y }));
    const median = medianOutline([a, spiky, a]);
    expect(median[0]?.x).toBeCloseTo(a[0]?.x ?? NaN);
    expect(medianOutline([[{ x: 1, y: 1 }]])).toEqual([]);
  });

  it('exposes raw polygons for the overlay', () => {
    const polygons = lipPolygons(face());
    expect(polygons.outer).toHaveLength(20);
    expect(polygons.inner).toHaveLength(20);
  });
});
