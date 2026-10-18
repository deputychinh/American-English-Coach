import type { PointerEvent } from 'react';

export type SwipeDirection = 'left' | 'right' | 'up' | 'down';

/** Finger travel between pointer down and up. */
export interface SwipeTravel {
  dx: number;
  dy: number;
  ms: number;
}

export interface SwipeHandlers {
  onLeft?: () => void;
  onRight?: () => void;
  /** Receives the travel so a sheet can require a long drag or a flick. */
  onDown?: (travel: SwipeTravel) => void;
  /** Live vertical drag (px, downward positive) for sheets that follow the finger. */
  onDrag?: (dy: number) => void;
  /** Released without a swipe: snap back. */
  onCancel?: () => void;
  isEnabled?: boolean;
}

export interface SwipeBindings {
  onPointerDown: (event: PointerEvent<HTMLElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLElement>) => void;
  onPointerCancel: () => void;
}

/** Where and when the finger went down. */
export interface SwipeStart {
  x: number;
  y: number;
  t: number;
  id: number;
}
