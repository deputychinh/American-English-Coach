import type { ArticulationFrame, ArticulationSpec } from '@/interfaces/articulation.interface';

/**
 * Side views of the 44 sounds (plan B5), by sound id. Coordinates follow the 200×200 drawing in
 * components/ArticulationDiagram: alveolar ridge near (52, 92), hard palate along y ≈ 86,
 * velum around (114, 86), upper incisors' edge at (43, 106). Postures follow the usual
 * textbook descriptions (Celce-Murcia et al., Baker): place, manner and voicing for consonants;
 * height, backness and rounding for vowels.
 */

const REST: ArticulationFrame = { tip: [52, 112], dorsum: [95, 100], jaw: 4, lips: 'neutral' };
const vowel = (dorsum: [number, number], jaw: number, lips: ArticulationFrame['lips']) =>
  ({ tip: [50, 104 + jaw / 2], dorsum, jaw, lips }) satisfies ArticulationFrame;

const IY = vowel([76, 90], 3, 'spread');
const IH = vowel([80, 94], 5, 'neutral');
const EH = vowel([82, 100], 9, 'neutral');
const EY = vowel([80, 96], 7, 'spread');
const AE = vowel([86, 108], 14, 'spread');
const AA = vowel([112, 112], 16, 'neutral');
const A = vowel([98, 110], 16, 'neutral');
const AO = vowel([114, 106], 12, 'rounded');
const OW = vowel([112, 98], 9, 'rounded');
const UH = vowel([108, 94], 5, 'rounded');
const UW = vowel([110, 88], 3, 'rounded');
const AH = vowel([100, 106], 11, 'neutral');
const SCHWA = vowel([96, 102], 7, 'neutral');
const R: ArticulationFrame = { tip: [64, 94], dorsum: [98, 98], jaw: 5, lips: 'rounded' };
const ER: ArticulationFrame = { ...R, jaw: 6 };

const at = (frame: Partial<ArticulationFrame>): ArticulationFrame => ({ ...REST, ...frame });
const BILABIAL = at({ jaw: 2, lips: 'closed' });
const LABIODENTAL = at({ jaw: 3, lips: 'labiodental' });
const DENTAL = at({ tip: [40, 104], dorsum: [90, 100], jaw: 4 });
const ALVEOLAR = at({ tip: [52, 93], dorsum: [90, 96], jaw: 3 });
const SIBILANT = at({ tip: [52, 96], dorsum: [88, 96], jaw: 2, lips: 'spread' });
const POSTALVEOLAR = at({ tip: [58, 95], dorsum: [86, 94], jaw: 3, lips: 'rounded' });
const VELAR = at({ tip: [54, 112], dorsum: [114, 86], jaw: 4 });

export const ARTICULATION: Record<string, ArticulationSpec> = {
  v01: { frames: [IY], isVoiced: true, airflow: 'mouth' },
  v02: { frames: [IH], isVoiced: true, airflow: 'mouth' },
  v03: { frames: [EH], isVoiced: true, airflow: 'mouth' },
  v04: { frames: [AE], isVoiced: true, airflow: 'mouth' },
  v05: { frames: [AA], isVoiced: true, airflow: 'mouth' },
  v06: { frames: [AA], isVoiced: true, airflow: 'mouth' },
  v07: { frames: [AO], isVoiced: true, airflow: 'mouth' },
  v08: { frames: [UH], isVoiced: true, airflow: 'mouth' },
  v09: { frames: [UW], isVoiced: true, airflow: 'mouth' },
  v10: { frames: [AH], isVoiced: true, airflow: 'mouth' },
  v11: { frames: [ER], isVoiced: true, airflow: 'mouth' },
  v12: { frames: [SCHWA], isVoiced: true, airflow: 'mouth' },
  d01: { frames: [EY, IH], isVoiced: true, airflow: 'mouth' },
  d02: { frames: [A, IH], isVoiced: true, airflow: 'mouth' },
  d03: { frames: [AO, IH], isVoiced: true, airflow: 'mouth' },
  d04: { frames: [OW, UH], isVoiced: true, airflow: 'mouth' },
  d05: { frames: [A, UH], isVoiced: true, airflow: 'mouth' },
  d06: { frames: [IH, R], isVoiced: true, airflow: 'mouth' },
  d07: { frames: [EH, R], isVoiced: true, airflow: 'mouth' },
  d08: { frames: [UH, R], isVoiced: true, airflow: 'mouth' },
  c01: {
    place: 'bilabial',
    frames: [BILABIAL],
    isVoiced: false,
    airflow: 'burst',
    contact: [31, 101],
  },
  c02: {
    place: 'bilabial',
    frames: [BILABIAL],
    isVoiced: true,
    airflow: 'burst',
    contact: [31, 101],
  },
  c03: {
    place: 'alveolar',
    frames: [ALVEOLAR],
    isVoiced: false,
    airflow: 'burst',
    contact: [52, 93],
  },
  c04: {
    place: 'alveolar',
    frames: [ALVEOLAR],
    isVoiced: true,
    airflow: 'burst',
    contact: [52, 93],
  },
  c05: { place: 'velar', frames: [VELAR], isVoiced: false, airflow: 'burst', contact: [114, 86] },
  c06: { place: 'velar', frames: [VELAR], isVoiced: true, airflow: 'burst', contact: [114, 86] },
  c07: {
    place: 'labiodental',
    frames: [LABIODENTAL],
    isVoiced: false,
    airflow: 'friction',
    contact: [42, 106],
  },
  c08: {
    place: 'labiodental',
    frames: [LABIODENTAL],
    isVoiced: true,
    airflow: 'friction',
    contact: [42, 106],
  },
  c09: {
    place: 'dental',
    frames: [DENTAL],
    isVoiced: false,
    airflow: 'friction',
    contact: [41, 104],
  },
  c10: {
    place: 'dental',
    frames: [DENTAL],
    isVoiced: true,
    airflow: 'friction',
    contact: [41, 104],
  },
  c11: {
    place: 'alveolar',
    frames: [SIBILANT],
    isVoiced: false,
    airflow: 'friction',
    contact: [52, 94],
  },
  c12: {
    place: 'alveolar',
    frames: [SIBILANT],
    isVoiced: true,
    airflow: 'friction',
    contact: [52, 94],
  },
  c13: {
    place: 'postalveolar',
    frames: [POSTALVEOLAR],
    isVoiced: false,
    airflow: 'friction',
    contact: [60, 92],
  },
  c14: {
    place: 'postalveolar',
    frames: [POSTALVEOLAR],
    isVoiced: true,
    airflow: 'friction',
    contact: [60, 92],
  },
  c15: { place: 'glottal', frames: [at({ jaw: 8 })], isVoiced: false, airflow: 'mouth' },
  c16: {
    place: 'postalveolar',
    frames: [at({ ...POSTALVEOLAR, tip: [56, 92] }), POSTALVEOLAR],
    isVoiced: false,
    airflow: 'friction',
    contact: [56, 92],
  },
  c17: {
    place: 'postalveolar',
    frames: [at({ ...POSTALVEOLAR, tip: [56, 92] }), POSTALVEOLAR],
    isVoiced: true,
    airflow: 'friction',
    contact: [56, 92],
  },
  c18: {
    place: 'bilabial',
    frames: [{ ...BILABIAL, isNasal: true }],
    isVoiced: true,
    airflow: 'nose',
    contact: [31, 101],
  },
  c19: {
    place: 'alveolar',
    frames: [{ ...ALVEOLAR, isNasal: true }],
    isVoiced: true,
    airflow: 'nose',
    contact: [52, 93],
  },
  c20: {
    place: 'velar',
    frames: [{ ...VELAR, isNasal: true }],
    isVoiced: true,
    airflow: 'nose',
    contact: [114, 86],
  },
  c21: {
    place: 'lateral',
    frames: [at({ tip: [52, 93], dorsum: [100, 106], jaw: 5 })],
    isVoiced: true,
    airflow: 'mouth',
    contact: [52, 93],
  },
  c22: { place: 'retroflex', frames: [R], isVoiced: true, airflow: 'mouth' },
  c23: {
    place: 'palatal',
    frames: [at({ tip: [50, 110], dorsum: [80, 89], jaw: 3, lips: 'spread' }), SCHWA],
    isVoiced: true,
    airflow: 'mouth',
  },
  c24: {
    place: 'labiovelar',
    frames: [at({ tip: [54, 112], dorsum: [112, 89], jaw: 3, lips: 'rounded' }), SCHWA],
    isVoiced: true,
    airflow: 'mouth',
  },
};
