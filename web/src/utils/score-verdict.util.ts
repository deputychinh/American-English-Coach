import {
  FREE_VARIANTS,
  FREE_VARIANTS_BEFORE_R,
  FREE_VARIANTS_FINAL,
  FREE_VARIANTS_INITIAL,
  GOP_CHECK_THRESHOLD,
  GOP_OK_THRESHOLD,
} from '@/constants/scoring.constant';
import type { AlignmentOp, ScoreVerdict, VisualVerdict } from '@/interfaces/scoring.interface';

/** Verdict rules (port of backend verdict.py and fusion.py). */

/** Alignment op + GOP + catalogue gate → one audio verdict. */
export const audioVerdict = (
  op: AlignmentOp,
  gop: number,
  isKnownEnabled: boolean,
): ScoreVerdict => {
  if (op === 'match') return gop >= GOP_CHECK_THRESHOLD ? 'ok' : 'check';
  if (gop >= GOP_OK_THRESHOLD) return 'ok';
  return isKnownEnabled ? 'error' : 'check';
};

/** Is `heard` an accepted way of saying `expected` here (merged vowels, unreleased stops…)? */
export const isFreeVariant = ({
  expected,
  heard,
  nextSymbol,
  isInitial,
  isFinal,
}: {
  expected: string;
  heard: string;
  nextSymbol: string | null;
  isInitial: boolean;
  isFinal: boolean;
}): boolean => {
  const tables = [FREE_VARIANTS];
  if (nextSymbol === 'R') tables.push(FREE_VARIANTS_BEFORE_R);
  if (isFinal) tables.push(FREE_VARIANTS_FINAL);
  if (isInitial) tables.push(FREE_VARIANTS_INITIAL);
  return tables.some((table) => table[expected]?.includes(heard) ?? false);
};

/** Audio is primary; only clearly visible sounds let the camera raise `check` to `error`. */
export const fuseVerdicts = (
  audio: ScoreVerdict,
  visual: VisualVerdict,
  confidence: string,
): { verdict: ScoreVerdict; showHint: boolean } => {
  if (visual !== 'off' || confidence === 'low') return { verdict: audio, showHint: false };
  if (audio === 'check' && confidence === 'high') return { verdict: 'error', showHint: true };
  return { verdict: audio, showHint: true };
};
