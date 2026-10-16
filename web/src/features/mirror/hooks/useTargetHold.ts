'use client';

import { useEffect, useRef, useState } from 'react';

import { HINT_DELAY_MS } from '@/constants/mirror.constant';
import type { TargetHold } from '@/interfaces/hooks.interface';
import type { MouthFeatures, TargetMap } from '@/interfaces/mouth.interface';
import { offTargetFeatures } from '@/utils/viseme-match.util';

const IDLE: TargetHold = { isOnTarget: false, isHeld: false, showHint: false, offFeatures: [] };

/** Tracks how long the mouth has been on/off target: hints after 500 ms off, success after `holdMs` on. */
export const useTargetHold = (
  features: MouthFeatures | null,
  targets: TargetMap,
  holdMs: number,
): TargetHold => {
  const onSinceRef = useRef<number | null>(null);
  const offSinceRef = useRef<number | null>(null);
  const [state, setState] = useState<TargetHold>(IDLE);

  useEffect(() => {
    // Evaluated in a frame callback so timing state updates stay off the render path.
    const frame = requestAnimationFrame(() => {
      const now = performance.now();
      if (!features) {
        onSinceRef.current = null;
        offSinceRef.current = null;
        setState(IDLE);
        return;
      }
      const off = offTargetFeatures(features, targets);
      if (off.length === 0) {
        offSinceRef.current = null;
        onSinceRef.current ??= now;
        const since = onSinceRef.current;
        setState({
          isOnTarget: true,
          isHeld: now - since >= holdMs,
          showHint: false,
          offFeatures: [],
        });
        return;
      }
      onSinceRef.current = null;
      offSinceRef.current ??= now;
      const since = offSinceRef.current;
      setState({
        isOnTarget: false,
        isHeld: false,
        showHint: now - since >= HINT_DELAY_MS,
        offFeatures: off,
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [features, targets, holdMs]);

  return state;
};
