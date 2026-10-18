import { useRef } from 'react';

import type { SwipeBindings, SwipeHandlers, SwipeStart } from '@/interfaces/gesture.interface';
import { classifySwipe } from '@/utils/swipe.util';

/**
 * Pointer handlers for swipes on one element. Taps still reach buttons inside it: nothing is
 * captured until the finger has clearly moved, and a swipe never fires a click.
 */
export const useSwipe = ({
  onLeft,
  onRight,
  onDown,
  onDrag,
  onCancel,
  isEnabled = true,
}: SwipeHandlers): SwipeBindings => {
  const startRef = useRef<SwipeStart | null>(null);

  const reset = (): void => {
    startRef.current = null;
  };

  return {
    onPointerDown: (event) => {
      if (!isEnabled || event.isPrimary === false) return;
      // Keep the whole drag on this element even when the finger leaves it. Not on controls:
      // a captured pointer would retarget their click to this element.
      const target = event.target as Element;
      if (!target.closest('button, a, input, select, textarea, [role="tab"]')) {
        event.currentTarget.setPointerCapture?.(event.pointerId);
      }
      startRef.current = {
        x: event.clientX,
        y: event.clientY,
        t: event.timeStamp,
        id: event.pointerId,
      };
    },
    onPointerMove: (event) => {
      const from = startRef.current;
      if (!from || from.id !== event.pointerId || !onDrag) return;
      onDrag(Math.max(0, event.clientY - from.y));
    },
    onPointerUp: (event) => {
      const from = startRef.current;
      reset();
      if (!from || from.id !== event.pointerId) return;
      const travel = {
        dx: event.clientX - from.x,
        dy: event.clientY - from.y,
        ms: event.timeStamp - from.t,
      };
      const direction = classifySwipe(travel);
      if (direction === 'left' && onLeft) onLeft();
      else if (direction === 'right' && onRight) onRight();
      else if (direction === 'down' && onDown) onDown(travel);
      else onCancel?.();
    },
    onPointerCancel: () => {
      reset();
      onCancel?.();
    },
  };
};
