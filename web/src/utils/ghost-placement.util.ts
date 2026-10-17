import { GHOST_LIP_SPAN } from '@/constants/mirror.constant';
import type { GhostPlacement, Point2 } from '@/interfaces/mouth.interface';

/**
 * Box for the ghost lips from the detected lip outline (normalised video coordinates). The video
 * is mirrored, so x flips; the width is the mouth width times `scale`, widened so the lip path
 * inside the TargetShape viewBox spans the mouth rather than the whole square.
 */
export const ghostPlacement = (outline: Point2[], scale: number): GhostPlacement | null => {
  if (outline.length < 3) return null;
  let minX = 1;
  let maxX = 0;
  let minY = 1;
  let maxY = 0;
  for (const point of outline) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  }
  const width = maxX - minX;
  if (width <= 0) return null;
  return {
    leftPercent: (1 - (minX + maxX) / 2) * 100,
    topPercent: ((minY + maxY) / 2) * 100,
    widthPercent: ((width * scale) / GHOST_LIP_SPAN) * 100,
  };
};
