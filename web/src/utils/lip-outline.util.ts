import { EYE_OUTER_LEFT, EYE_OUTER_RIGHT, LIP_INNER, LIP_OUTER } from '@/constants/mirror.constant';
import type { Point2, Point3 } from '@/interfaces/mouth.interface';

/** Outer then inner lip points (40), centred on the mouth and scaled by the eye distance. */
export const lipOutline = (landmarks: Point3[]): Point2[] => {
  const points = [...LIP_OUTER, ...LIP_INNER].map((index) => landmarks[index]);
  const eyeLeft = landmarks[EYE_OUTER_LEFT];
  const eyeRight = landmarks[EYE_OUTER_RIGHT];
  if (points.some((point) => point === undefined) || !eyeLeft || !eyeRight) return [];
  const valid = points as Point3[];
  const scale = Math.hypot(eyeLeft.x - eyeRight.x, eyeLeft.y - eyeRight.y) || 1;
  const centre = valid.reduce(
    (sum, point) => ({ x: sum.x + point.x / valid.length, y: sum.y + point.y / valid.length }),
    { x: 0, y: 0 },
  );
  return valid.map((point) => ({
    x: (point.x - centre.x) / scale,
    y: (point.y - centre.y) / scale,
  }));
};

/** Point-wise median of several outlines (robust to a few bad frames). */
export const medianOutline = (outlines: Point2[][]): Point2[] => {
  const usable = outlines.filter((outline) => outline.length === LIP_OUTER.length * 2);
  const first = usable[0];
  if (!first) return [];
  const median = (values: number[]): number => {
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)] ?? 0;
  };
  return first.map((_, index) => ({
    x: median(usable.map((outline) => outline[index]?.x ?? 0)),
    y: median(usable.map((outline) => outline[index]?.y ?? 0)),
  }));
};

/** Raw landmark pixels of the lips for the live overlay (already in video coordinates 0..1). */
export const lipPolygons = (landmarks: Point3[]): { outer: Point2[]; inner: Point2[] } => ({
  outer: LIP_OUTER.map((index) => landmarks[index] ?? { x: 0, y: 0 }),
  inner: LIP_INNER.map((index) => landmarks[index] ?? { x: 0, y: 0 }),
});
