/** Points drawn per contour: enough for a 4 s sentence at ~30 ms per point. */
export const CONTOUR_POINTS = 120;

/** Semitone range drawn above and below the speaker's median pitch. */
export const CONTOUR_RANGE_ST = 8;

/** Share of the contour read as the sentence ending. */
export const CONTOUR_ENDING_SHARE = 0.2;

/** Change in semitones over the ending that counts as a rise or a fall. */
export const CONTOUR_ENDING_ST = 1.5;
