/** Lip posture seen from the side and from the front. */
export type LipShape = 'closed' | 'spread' | 'neutral' | 'rounded' | 'labiodental';

/** Where the air goes: out of the mouth, through the nose, a released stop or a narrow hiss. */
export type Airflow = 'mouth' | 'nose' | 'burst' | 'friction';

/** One articulatory posture in the 200×200 side view (face to the left). */
export interface ArticulationFrame {
  /** Tongue tip, x and y. */
  tip: [number, number];
  /** Highest point of the tongue body, x and y. */
  dorsum: [number, number];
  /** Lower-jaw drop in px: 2 nearly closed … 16 wide open. */
  jaw: number;
  lips: LipShape;
  /** Lowered for nasals: the air leaves through the nose. */
  isNasal?: boolean;
}

/** Place of articulation of a consonant (vowels describe themselves by tongue position). */
export type Place =
  | 'bilabial'
  | 'labiodental'
  | 'dental'
  | 'alveolar'
  | 'lateral'
  | 'postalveolar'
  | 'retroflex'
  | 'palatal'
  | 'velar'
  | 'labiovelar'
  | 'glottal';

/** A sound's diagram: one frame, or two (start → end) for diphthongs, glides and affricates. */
export interface ArticulationSpec {
  frames: ArticulationFrame[];
  isVoiced: boolean;
  airflow: Airflow;
  place?: Place;
  /** Where tongue or lips touch or come close (drawn as a dot); none for vowels. */
  contact?: [number, number];
}
