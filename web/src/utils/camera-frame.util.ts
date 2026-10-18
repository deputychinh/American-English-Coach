import { MOUTH_ZOOM_MAX, MOUTH_ZOOM_SHARE } from '@/constants/mirror.constant';
import type { BoxSize, MouthZoom, Point2, ZoomShift } from '@/interfaces/mouth.interface';

/**
 * Size of a box with the video's aspect ratio that covers the stage (CSS `object-fit: cover`).
 * Video, landmark canvas and ghost all live in this box, so normalised video coordinates map
 * straight to percentages of it however the stage crops the camera.
 */
export const coverFrame = (stage: BoxSize, aspect: number): BoxSize => {
  const width = Math.max(stage.width, stage.height * aspect);
  return { width, height: width / aspect };
};

const clampShift = ({ shift, frame, stage, scale }: ZoomShift): number => {
  const limit = Math.max(0, (scale * frame - stage) / 2);
  return Math.min(limit, Math.max(-limit, shift));
};

/**
 * Zoom about the frame centre and pan so the mirrored mouth sits in the middle of the stage,
 * never showing an empty edge. Values are rounded to keep re-renders and transitions calm.
 */
export const mouthZoom = ({
  outline,
  stage,
  frame,
  share = MOUTH_ZOOM_SHARE,
  maxScale = MOUTH_ZOOM_MAX,
}: {
  outline: Point2[];
  stage: BoxSize;
  frame: BoxSize;
  share?: number;
  maxScale?: number;
}): MouthZoom | null => {
  if (outline.length < 3 || stage.width <= 0 || frame.width <= 0) return null;
  const xs = outline.map((point) => point.x);
  const ys = outline.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const mouthWidth = (maxX - minX) * frame.width;
  if (mouthWidth <= 0) return null;
  const raw = (share * stage.width) / mouthWidth;
  const scale = Math.round(Math.min(maxScale, Math.max(1, raw)) * 10) / 10;
  const centreX = (1 - (minX + maxX) / 2) * frame.width;
  const centreY = ((Math.min(...ys) + Math.max(...ys)) / 2) * frame.height;
  const x = clampShift({
    shift: -scale * (centreX - frame.width / 2),
    frame: frame.width,
    stage: stage.width,
    scale,
  });
  const y = clampShift({
    shift: -scale * (centreY - frame.height / 2),
    frame: frame.height,
    stage: stage.height,
    scale,
  });
  // Toward zero so rounding never pans past the edge; `+ 0` drops a negative zero.
  const snap = (value: number): number => Math.trunc(value / 2) * 2 + 0;
  return { scale, x: snap(x), y: snap(y) };
};
