import type { MouseEvent } from 'react';

export interface PressToTalkOptions {
  /** Scoring: the button does nothing. */
  isBusy: boolean;
  isRecording: boolean;
  start: () => Promise<void>;
  stop: () => Promise<void>;
}

export interface PressToTalkHandlers {
  onPointerDown: () => void;
  onPointerUp: () => void;
  onPointerCancel: () => void;
  onClick: () => void;
  onContextMenu: (event: MouseEvent) => void;
}
