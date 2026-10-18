import {
  SWIPE_AXIS_RATIO,
  SWIPE_DISTANCE_PX,
  SWIPE_FLICK_MIN_PX,
  SWIPE_FLICK_VELOCITY,
} from '@/constants/gesture.constant';
import type { SwipeDirection, SwipeTravel } from '@/interfaces/gesture.interface';

/**
 * Turns finger travel into a swipe direction, or null for a tap, a diagonal or a short slow drag.
 * A long drag or a quick flick both count, as in the iOS photo viewer.
 */
export const classifySwipe = ({ dx, dy, ms }: SwipeTravel): SwipeDirection | null => {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  const isHorizontal = ax >= ay * SWIPE_AXIS_RATIO;
  const isVertical = ay >= ax * SWIPE_AXIS_RATIO;
  if (!isHorizontal && !isVertical) return null;
  const travel = isHorizontal ? ax : ay;
  const velocity = travel / Math.max(1, ms);
  const isSwipe =
    travel >= SWIPE_DISTANCE_PX ||
    (travel >= SWIPE_FLICK_MIN_PX && velocity >= SWIPE_FLICK_VELOCITY);
  if (!isSwipe) return null;
  if (isHorizontal) return dx < 0 ? 'left' : 'right';
  return dy < 0 ? 'up' : 'down';
};
