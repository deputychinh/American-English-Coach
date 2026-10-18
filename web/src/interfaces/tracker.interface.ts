import type { TrackerStatus } from '@/enums/tracker-status.enum';
import type { MouthFeatures, Point2, TrackedFrame } from '@/interfaces/mouth.interface';

/** Latest observation for the UI (throttled); `features` are calibrated when a calibration exists. */
export interface TrackedSample {
  t: number;
  raw: MouthFeatures;
  features: MouthFeatures;
  quality: number;
  outline: Point2[];
}

export interface MouthTracker {
  status: TrackerStatus;
  error: string | null;
  fps: number;
  isFaceVisible: boolean;
  latest: TrackedSample | null;
  /** Callback refs for the <video> and overlay <canvas> the tracker draws into. */
  attachVideo: (element: HTMLVideoElement | null) => void;
  attachCanvas: (element: HTMLCanvasElement | null) => void;
  framesBetween: (from: number, to: number) => TrackedFrame[];
  rawSince: (from: number) => MouthFeatures[];
  /** One JPEG crop of the mouth from the live video (only when the learner asks for it). */
  snapshotMouth: () => Promise<Blob | null>;
  /** Ask for the camera again after a refusal or a failure. */
  retry: () => void;
}
