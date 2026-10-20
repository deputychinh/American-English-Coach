/** One point of a pitch contour: `t` 0..1 across the spoken stretch, semitones from the median. */
export interface ContourPoint {
  t: number;
  /** null where the voice is silent or unvoiced (the line breaks there). */
  st: number | null;
}

/** Direction of the last stretch of a contour, for the text that describes the picture. */
export type ContourEnding = 'rise' | 'fall' | 'level';

export interface PitchContours {
  learner: ContourPoint[];
  /** null when no model voice could be decoded (offline, no bundled clip). */
  model: ContourPoint[] | null;
}
