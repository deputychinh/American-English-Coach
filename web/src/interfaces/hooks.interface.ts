import type { AsyncStatus } from '@/enums/async-status.enum';
import type { RecorderStatus } from '@/enums/recorder-status.enum';
import type { TrackerStatus } from '@/enums/tracker-status.enum';
import type { Calibration, MouthFeatures, TrackedFrame } from '@/interfaces/mouth.interface';
import type { PracticeItem, Recording } from '@/interfaces/practice.interface';

export interface AsyncState<T> {
  status: AsyncStatus;
  data: T | null;
  error: string | null;
}

export interface AsyncResult<T> extends AsyncState<T> {
  reload: () => void;
}

export interface Recorder {
  status: RecorderStatus;
  level: number;
  seconds: number;
  error: string | null;
  start: () => Promise<void>;
  stop: () => Promise<Recording | null>;
}

export interface RecorderSession {
  context: AudioContext;
  stream: MediaStream;
  node: AudioWorkletNode | ScriptProcessorNode;
  chunks: Float32Array[];
  startedAt: number | null;
  timer: ReturnType<typeof setTimeout> | null;
}

export interface ReferenceAudio {
  play: (text: string) => void;
  isPlaying: boolean;
  error: string | null;
}

export interface AssessRequest {
  item: PracticeItem;
  audio: Blob;
  mouthFrames: { t: number; features: MouthFeatures; quality: number }[];
  audioStartedAt: number | null;
}

export interface LandmarkerState<T> {
  landmarker: T | null;
  status: TrackerStatus;
  error: string | null;
}

export interface CalibrationState {
  value: Calibration | null;
  isLoaded: boolean;
  reload: () => void;
}

export interface MouthTrackerOptions {
  enabled: boolean;
  calibration: Calibration | null;
}

export interface BufferedFrame extends TrackedFrame {
  raw: MouthFeatures;
}

export interface TargetHold {
  isOnTarget: boolean;
  isHeld: boolean;
  showHint: boolean;
  offFeatures: string[];
  /** 0..1 share of `holdMs` already held on target. */
  holdProgress: number;
}
