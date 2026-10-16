'use client';

import { useEffect, useRef } from 'react';

/** A short soft tone when the hold completes; silent when muted or reduced motion is preferred. */
export const useSuccessChime = (trigger: boolean, muted: boolean): void => {
  const playedRef = useRef(false);

  useEffect(() => {
    if (!trigger) {
      playedRef.current = false;
      return;
    }
    if (playedRef.current || muted) return;
    if (globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    playedRef.current = true;
    try {
      const context = new AudioContext();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.08, context.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.35);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.4);
      oscillator.onended = () => void context.close();
    } catch {
      // No audio output available; the green frame is the primary signal anyway.
    }
  }, [trigger, muted]);
};
