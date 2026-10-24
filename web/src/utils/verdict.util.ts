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

const SEVERITY: Record<Verdict, number> = {
  [Verdict.ok]: 0,
  [Verdict.check]: 1,
  [Verdict.error]: 2,
};

/** A word reads as its weakest sound: one wrong phone makes the whole word "wrong". */
export const worstVerdict = (verdicts: Verdict[]): Verdict =>
  verdicts.reduce<Verdict>(
    (worst, verdict) => (SEVERITY[verdict] > SEVERITY[worst] ? verdict : worst),
    Verdict.ok,
  );

/** Index of the item to open first: the first one with the weakest verdict (0 when all are ok). */
export const firstWorstIndex = (verdicts: Verdict[]): number => {
  const worst = worstVerdict(verdicts);
  return Math.max(0, verdicts.indexOf(worst));
};
