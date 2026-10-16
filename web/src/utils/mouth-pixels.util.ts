import {
  MOUTH_CROP_PADDING,
  MOUTH_CROP_WIDTH,
  MOUTH_MIN_CROP_PX,
  TEETH_MAX_SATURATION,
  TEETH_MIN_VALUE,
  TONGUE_MIN_SATURATION,
  TONGUE_MIN_VALUE,
  TONGUE_RED_MARGIN,
} from '@/constants/mirror.constant';
import type {
  MouthPixelRatios,
  MouthSampleOptions,
  PixelPolygonOptions,
  Point2,
} from '@/interfaces/mouth.interface';

const EMPTY: MouthPixelRatios = { teeth: 0, tongue: 0, pixels: 0 };

/** Ray-casting point-in-polygon test. */
export const isInsidePolygon = (point: Point2, polygon: Point2[]): boolean => {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const a = polygon[i];
    const b = polygon[j];
    if (!a || !b) continue;
    const crosses = a.y > point.y !== b.y > point.y;
    if (crosses && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
};

const classify = (r: number, g: number, b: number): 'teeth' | 'tongue' | null => {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const saturation = max === 0 ? 0 : (max - min) / max;
  if (max >= TEETH_MIN_VALUE && saturation <= TEETH_MAX_SATURATION) return 'teeth';
  const isRed = r >= g + TONGUE_RED_MARGIN && r >= b + TONGUE_RED_MARGIN;
  if (isRed && saturation >= TONGUE_MIN_SATURATION && max >= TONGUE_MIN_VALUE) return 'tongue';
  return null;
};

/** Share of teeth-like and tongue-like pixels inside a polygon of an RGBA buffer. */
export const innerMouthRatios = ({
  data,
  width,
  height,
  polygon,
}: PixelPolygonOptions): MouthPixelRatios => {
  if (polygon.length < 3) return EMPTY;
  const xs = polygon.map((p) => p.x);
  const ys = polygon.map((p) => p.y);
  const minX = Math.max(0, Math.floor(Math.min(...xs)));
  const maxX = Math.min(width - 1, Math.ceil(Math.max(...xs)));
  const minY = Math.max(0, Math.floor(Math.min(...ys)));
  const maxY = Math.min(height - 1, Math.ceil(Math.max(...ys)));
  let inside = 0;
  let teeth = 0;
  let tongue = 0;
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      if (!isInsidePolygon({ x: x + 0.5, y: y + 0.5 }, polygon)) continue;
      inside += 1;
      const offset = (y * width + x) * 4;
      const kind = classify(data[offset] ?? 0, data[offset + 1] ?? 0, data[offset + 2] ?? 0);
      if (kind === 'teeth') teeth += 1;
      else if (kind === 'tongue') tongue += 1;
    }
  }
  if (inside === 0) return EMPTY;
  return { teeth: teeth / inside, tongue: tongue / inside, pixels: inside };
};

/**
 * Crops the inner mouth from the live video into a small scratch canvas and classifies its pixels.
 * Nothing leaves the browser: only the two ratios are kept.
 */
export const sampleMouthPixels = ({
  canvas,
  video,
  polygon,
}: MouthSampleOptions): MouthPixelRatios => {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh || polygon.length < 3) return EMPTY;
  const xs = polygon.map((p) => p.x * vw);
  const ys = polygon.map((p) => p.y * vh);
  const boxW = Math.max(...xs) - Math.min(...xs);
  const boxH = Math.max(...ys) - Math.min(...ys);
  if (boxW < MOUTH_MIN_CROP_PX || boxH < MOUTH_MIN_CROP_PX) return EMPTY;
  const sx = Math.max(0, Math.min(...xs) - boxW * MOUTH_CROP_PADDING);
  const sy = Math.max(0, Math.min(...ys) - boxH * MOUTH_CROP_PADDING);
  const sw = Math.min(vw - sx, boxW * (1 + 2 * MOUTH_CROP_PADDING));
  const sh = Math.min(vh - sy, boxH * (1 + 2 * MOUTH_CROP_PADDING));
  const scale = Math.min(1, MOUTH_CROP_WIDTH / sw);
  const cw = Math.max(1, Math.round(sw * scale));
  const ch = Math.max(1, Math.round(sh * scale));
  if (canvas.width !== cw || canvas.height !== ch) {
    canvas.width = cw;
    canvas.height = ch;
  }
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return EMPTY;
  context.drawImage(video, sx, sy, sw, sh, 0, 0, cw, ch);
  const image = context.getImageData(0, 0, cw, ch);
  const scaled = polygon.map((p, index) => ({
    x: ((xs[index] ?? 0) - sx) * scale,
    y: ((ys[index] ?? 0) - sy) * scale,
  }));
  return innerMouthRatios({ data: image.data, width: cw, height: ch, polygon: scaled });
};
