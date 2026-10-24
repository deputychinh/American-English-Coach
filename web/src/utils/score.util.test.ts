import { ScoreTone } from '@/enums/score-tone.enum';

import { scorePercent, scoreTone } from './score.util';

describe('score util', () => {
  it('gives an unsure sound half credit and reads the percent as a tone', () => {
    expect(scorePercent(3, 1, 4)).toBe(88);
    expect(scorePercent(0, 0, 0)).toBe(0);
    expect([scoreTone(80), scoreTone(79), scoreTone(50), scoreTone(49)]).toEqual([
      ScoreTone.Good,
      ScoreTone.Fair,
      ScoreTone.Fair,
      ScoreTone.Low,
    ]);
  });
});
