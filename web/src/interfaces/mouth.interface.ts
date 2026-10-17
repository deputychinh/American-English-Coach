/** Raw or calibrated mouth features; keys follow content/visemes.json `features`. */
export interface MouthFeatures {
  aperture: number;
  width: number;
  roundness: number;
  jaw: number;
  lipClosed: number;
  lowerLipTuck: number;
  /** Share of the inner-mouth pixels that look like teeth (bright, unsaturated). Experimental. */
  teethVisible: number;
  /** Share of the inner-mouth pixels that look like tongue (red, saturated). Experimental. */
  tongueVisible: number;
}

export type MouthFeatureName = keyof MouthFeatures;

export interface Point2 {
  x: number;
  y: number;
}

export interface Point3 extends Point2 {
  z: number;
}

/** One camera frame as sent to the API (never pixels). */
export interface MouthFrame {
  t: number;
  features: MouthFeatures;
  quality: number;
}

/** Frame kept in the browser only: adds the lip outline for the result replay. */
export interface TrackedFrame extends MouthFrame {
  outline: Point2[];
}

export interface FeatureRange {
  min: number;
  max: number;
}

export type Calibration = Record<MouthFeatureName, FeatureRange>;

export interface HeadPose {
  yawDegrees: number;
  pitchDegrees: number;
}

export interface MouthPixelRatios {
  teeth: number;
  tongue: number;
  pixels: number;
}

export interface RawFaceObservation {
  landmarks: Point3[];
  blendshapes: Record<string, number>;
  pose: HeadPose | null;
  pixels?: MouthPixelRatios;
}

export interface PixelPolygonOptions {
  data: Uint8ClampedArray;
  width: number;
  height: number;
  /** Polygon in pixel coordinates of `data`. */
  polygon: Point2[];
}

export interface MouthSampleOptions {
  canvas: HTMLCanvasElement;
  video: HTMLVideoElement;
  /** Inner-lip polygon in normalised video coordinates. */
  polygon: Point2[];
}

export interface TargetRange {
  min?: number;
  max?: number;
}

export type TargetMap = Partial<Record<MouthFeatureName, TargetRange>>;

/** Where to draw the ghost target lips over the mirrored video, in percent of the frame. */
export interface GhostPlacement {
  leftPercent: number;
  topPercent: number;
  widthPercent: number;
}
