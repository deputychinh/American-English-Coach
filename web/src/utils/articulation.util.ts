import type { ArticulationFrame, ArticulationSpec } from '@/interfaces/articulation.interface';

/** The fixed drawing is made for a 4 px jaw drop; the jaw and lower lip move from there. */
const BASE_JAW = 4;

const xy = (x: number, y: number): string => `${String(x)} ${String(y)}`;

/**
 * The tongue as one closed shape: from the root up the throat to the highest point of the body,
 * forward to the tip, under the tip and back along the floor of the mouth (which moves with
 * the jaw). Smooth at the body: the two control points around it are mirrored.
 */
export const tonguePath = (frame: ArticulationFrame): string => {
  const [tx, ty] = frame.tip;
  const [dx, dy] = frame.dorsum;
  const floor = 138 + frame.jaw;
  return [
    `M ${xy(132, 160)}`,
    `C ${xy(134, 134)} ${xy(dx + 20, dy + 1)} ${xy(dx, dy)}`,
    `C ${xy(dx - 20, dy - 1)} ${xy(tx + 12, ty - 3)} ${xy(tx, ty)}`,
    `C ${xy(tx - 4, ty + 5)} ${xy(tx + 2, ty + 10)} ${xy(tx + 10, ty + 11)}`,
    `C ${xy(tx + 22, ty + 14)} ${xy(70, floor + 6)} ${xy(96, floor + 7)}`,
    `C ${xy(116, floor + 8)} ${xy(128, 168)} ${xy(132, 160)} Z`,
  ].join(' ');
};

/** Shift of the lower jaw and teeth. */
export const jawShift = (frame: ArticulationFrame): string =>
  `translate(0 ${String(frame.jaw - BASE_JAW)})`;

/** Shift of each lip: closed lips meet, rounded lips push forward, f/v brings the lip to the teeth. */
export const lipShift = (frame: ArticulationFrame): { upper: string; lower: string } => {
  const drop = frame.jaw - BASE_JAW;
  switch (frame.lips) {
    case 'closed':
      return { upper: 'translate(0 0)', lower: 'translate(0 -3)' };
    case 'labiodental':
      return { upper: 'translate(0 0)', lower: 'translate(9 -2)' };
    case 'rounded':
      return { upper: 'translate(-5 0)', lower: `translate(-5 ${String(drop - 1)})` };
    case 'spread':
      return { upper: 'translate(2 0)', lower: `translate(2 ${String(drop)})` };
    default:
      return { upper: 'translate(0 0)', lower: `translate(0 ${String(drop)})` };
  }
};

/** Vowel description by tongue position and lips, as copy keys. */
export const vowelFeatures = (
  frame: ArticulationFrame,
): { height: 'high' | 'mid' | 'low'; backness: 'front' | 'central' | 'back' } => {
  const [x, y] = frame.dorsum;
  const height = y < 92 ? 'high' : y < 104 ? 'mid' : 'low';
  const backness = x < 88 ? 'front' : x < 104 ? 'central' : 'back';
  return { height, backness };
};

/** Front view: the mouth opening as an ellipse (rx, ry) for one frame. */
export const mouthOpening = (frame: ArticulationFrame): { rx: number; ry: number } => {
  const open = 3 + frame.jaw * 0.6;
  switch (frame.lips) {
    case 'closed':
      return { rx: 20, ry: 0.8 };
    case 'labiodental':
      return { rx: 18, ry: 2 };
    case 'rounded':
      return { rx: 7 + frame.jaw * 0.2, ry: 6 + frame.jaw * 0.3 };
    case 'spread':
      return { rx: 24, ry: open * 0.7 };
    default:
      return { rx: 18, ry: open };
  }
};

/** True for vowels and diphthongs (no place of articulation). */
export const isVowelSpec = (spec: ArticulationSpec): boolean => spec.place === undefined;
