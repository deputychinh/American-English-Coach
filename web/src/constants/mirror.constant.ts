export const MEDIAPIPE_WASM_PATH = '/vendor/mediapipe';
export const FACE_MODEL_PATH = '/vendor/mediapipe/face_landmarker.task';
export const HINT_DELAY_MS = 500;
/** A feature one full tolerance outside its range scores 0; inside scores 1. */
export const MATCH_TOLERANCE = 0.25;
/** Share of speaking frames that must sit inside the target ranges for the mouth to count. */
export const MOUTH_HIT_RATE = 0.3;
/** Consecutive passes (sound and mouth) that mark a sound as mastered in the mirror. */
export const MASTERY_STREAK = 3;
/** The ghost target lips are drawn this many times wider than the detected mouth. */
export const GHOST_SCALE = 1.35;
/** Share of the TargetShape viewBox width that the widest lip path spans (14..106 of 120). */
export const GHOST_LIP_SPAN = 0.77;
export const MIN_FPS = 24;
export const FPS_SAMPLE_FRAMES = 60;
export const MAX_YAW_DEGREES = 20;
export const MAX_PITCH_DEGREES = 15;
export const FRAME_BUFFER_SECONDS = 20;
export const UI_REFRESH_HZ = 15;
export const DEFAULT_CALIBRATION_STEP_SECONDS = 3;
/** Landmark indices (MediaPipe Face Mesh topology). */
export const LIP_OUTER = [
  61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 409, 270, 269, 267, 0, 37, 39, 40, 185,
];
export const LIP_INNER = [
  78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308, 415, 310, 311, 312, 13, 82, 81, 80, 191,
];
export const UPPER_INNER_LIP = 13;
export const LOWER_INNER_LIP = 14;
export const MOUTH_LEFT_CORNER = 61;
export const MOUTH_RIGHT_CORNER = 291;
export const EYE_OUTER_LEFT = 33;
export const EYE_OUTER_RIGHT = 263;
export const FEATURE_NAMES = [
  'aperture',
  'width',
  'roundness',
  'jaw',
  'lipClosed',
  'lowerLipTuck',
  'teethVisible',
  'tongueVisible',
] as const;
/** Inner-mouth pixel analysis (teeth/tongue estimate). */
export const MOUTH_CROP_WIDTH = 160;
export const MOUTH_CROP_PADDING = 0.1;
export const MOUTH_MIN_CROP_PX = 4;
export const TEETH_MIN_VALUE = 150;
export const TEETH_MAX_SATURATION = 0.28;
export const TONGUE_MIN_VALUE = 70;
export const TONGUE_MIN_SATURATION = 0.3;
export const TONGUE_RED_MARGIN = 20;
/** One-off mouth snapshot sent to the tutor on request. */
export const SNAPSHOT_MAX_WIDTH = 512;
export const SNAPSHOT_PADDING = 0.6;
