import { Verdict } from '@/api/coach.schema';
import { getCopy } from '@/locales';

/** Icon + label for a verdict; colour is never the only signal (WCAG 1.4.1). */
export const verdictGlyph = (verdict: Verdict): string => {
  if (verdict === Verdict.ok) return '✓';
  if (verdict === Verdict.check) return '?';
  return '✕';
};

export const verdictLabel = (verdict: Verdict): string => getCopy().verdict[verdict];

export const verdictModifier = (verdict: Verdict): string => `is-${verdict}`;
