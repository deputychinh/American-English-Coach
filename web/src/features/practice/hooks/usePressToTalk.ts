'use client';

import { useRef } from 'react';

import { HOLD_TO_TALK_MS } from '@/constants/recorder.constant';
import type { PressToTalkHandlers, PressToTalkOptions } from '@/interfaces/press-to-talk.interface';

/** The click a browser fires after a pointer press lands within this window. */
const CLICK_AFTER_PRESS_MS = 500;

/**
 * Record button that works both ways (BoldVoice, walkie-talkie apps): hold to talk and let go to
 * score, or tap once and the take ends on silence or a second tap. Keyboard and switch users get
 * the tap toggle through the click event.
 */
export const usePressToTalk = ({
  isBusy,
  isRecording,
  start,
  stop,
}: PressToTalkOptions): PressToTalkHandlers => {
  /** Start of a press that began a take, and the start itself (the mic may still be opening). */
  const pressRef = useRef<{ at: number; started: Promise<void> } | null>(null);
  /** When a press was last handled: the click fired right after it must not toggle again. */
  const handledAtRef = useRef(-Infinity);

  const release = (): void => {
    const press = pressRef.current;
    pressRef.current = null;
    if (!press) return;
    handledAtRef.current = performance.now();
    if (handledAtRef.current - press.at < HOLD_TO_TALK_MS) return;
    void press.started.then(stop);
  };

  return {
    onPointerDown: () => {
      if (isBusy || isRecording) return;
      pressRef.current = { at: performance.now(), started: start() };
    },
    onPointerUp: release,
    onPointerCancel: release,
    onClick: () => {
      if (isBusy || performance.now() - handledAtRef.current < CLICK_AFTER_PRESS_MS) return;
      void (isRecording ? stop() : start());
    },
    // A long press must not open the iOS callout or a context menu over the button.
    onContextMenu: (event) => event.preventDefault(),
  };
};
