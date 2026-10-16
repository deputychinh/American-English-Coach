import {
  EYE_OUTER_LEFT,
  EYE_OUTER_RIGHT,
  LOWER_INNER_LIP,
  MAX_PITCH_DEGREES,
  MAX_YAW_DEGREES,
  MOUTH_LEFT_CORNER,
  MOUTH_RIGHT_CORNER,
  UPPER_INNER_LIP,
} from '@/constants/mirror.constant';
import type {
  HeadPose,
  MouthFeatures,
  Point2,
  RawFaceObservation,
} from '@/interfaces/mouth.interface';

const distance = (a: Point2, b: Point2): number => Math.hypot(a.x - b.x, a.y - b.y);
const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

/** Yaw/pitch in degrees from a column-major 4×4 facial transformation matrix. */
export const poseFromMatrix = (matrix: ArrayLike<number>): HeadPose | null => {
  if (matrix.length < 16) return null;
  const r00 = matrix[0] ?? 0;
  const r02 = matrix[8] ?? 0;
  const r12 = matrix[9] ?? 0;
  const r22 = matrix[10] ?? 1;
  const yaw = Math.atan2(r02, r22);
  const pitch = Math.atan2(-r12, Math.hypot(r00, matrix[4] ?? 0));
  const toDegrees = 180 / Math.PI;
  return { yawDegrees: yaw * toDegrees, pitchDegrees: pitch * toDegrees };
};

/** 1 when the face is frontal; falls off linearly past the yaw/pitch limits. */
export const poseQuality = (pose: HeadPose | null): number => {
  if (pose === null) return 1;
  const yaw = clamp01(1 - Math.max(0, Math.abs(pose.yawDegrees) - MAX_YAW_DEGREES) / 20);
  const pitch = clamp01(1 - Math.max(0, Math.abs(pose.pitchDegrees) - MAX_PITCH_DEGREES) / 15);
  return Math.min(yaw, pitch);
};

/**
 * Raw (uncalibrated) mouth features. Distances are divided by the inter-ocular distance so the
 * values do not depend on how far the learner sits from the camera.
 */
export const rawMouthFeatures = ({
  landmarks,
  blendshapes,
  pixels,
}: RawFaceObservation): MouthFeatures | null => {
  const upper = landmarks[UPPER_INNER_LIP];
  const lower = landmarks[LOWER_INNER_LIP];
  const left = landmarks[MOUTH_LEFT_CORNER];
  const right = landmarks[MOUTH_RIGHT_CORNER];
  const eyeLeft = landmarks[EYE_OUTER_LEFT];
  const eyeRight = landmarks[EYE_OUTER_RIGHT];
  if (!upper || !lower || !left || !right || !eyeLeft || !eyeRight) return null;
  const eyes = distance(eyeLeft, eyeRight);
  if (eyes <= 0) return null;
  const aperture = distance(upper, lower) / eyes;
  const width = distance(left, right) / eyes;
  const pucker = ((blendshapes.mouthPucker ?? 0) + (blendshapes.mouthFunnel ?? 0)) / 2;
  return {
    aperture,
    width,
    roundness: clamp01(pucker),
    jaw: clamp01(blendshapes.jawOpen ?? 0),
    lipClosed: clamp01(blendshapes.mouthClose ?? 0),
    lowerLipTuck: clamp01(blendshapes.mouthRollLower ?? 0),
    teethVisible: clamp01(pixels?.teeth ?? 0),
    tongueVisible: clamp01(pixels?.tongue ?? 0),
  };
};
