import { Verdict } from '@/api/coach.schema';

import { verdictGlyph, verdictLabel, verdictModifier } from './verdict.util';

describe('verdict util', () => {
  it('maps each verdict to a glyph, a Vietnamese label and a state class', () => {
    expect([Verdict.ok, Verdict.check, Verdict.error].map(verdictGlyph)).toEqual(['✓', '?', '✕']);
    expect(verdictLabel(Verdict.check)).toBe('nghe lại');
    expect(verdictModifier(Verdict.error)).toBe('is-error');
  });
});
