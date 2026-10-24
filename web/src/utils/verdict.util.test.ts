import { Verdict } from '@/api/coach.schema';

import {
  firstWorstIndex,
  verdictGlyph,
  verdictLabel,
  verdictModifier,
  worstVerdict,
} from './verdict.util';

describe('verdict util', () => {
  it('maps each verdict to a glyph, a Vietnamese label and a state class', () => {
    expect([Verdict.ok, Verdict.check, Verdict.error].map(verdictGlyph)).toEqual(['✓', '?', '✕']);
    expect(verdictLabel(Verdict.check)).toBe('nghe lại');
    expect(verdictModifier(Verdict.error)).toBe('is-error');
  });

  it('reads a word as its weakest sound and opens the first weakest one', () => {
    const { ok, check, error } = Verdict;
    expect(worstVerdict([ok, check, ok])).toBe(check);
    expect(worstVerdict([check, error, check])).toBe(error);
    expect(worstVerdict([])).toBe(ok);
    expect(firstWorstIndex([ok, check, error, error])).toBe(2);
    expect(firstWorstIndex([ok, ok])).toBe(0);
    expect(firstWorstIndex([])).toBe(0);
  });
});
