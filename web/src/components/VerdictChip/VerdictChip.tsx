import type { ReactElement } from 'react';

import type { Verdict } from '@/api/coach.schema';
import { cx } from '@/utils/cx.util';
import { verdictGlyph, verdictLabel, verdictModifier } from '@/utils/verdict.util';

import './VerdictChip.css';

interface VerdictChipProps {
  ipa: string;
  verdict: Verdict;
  isSelected?: boolean;
  onSelect?: () => void;
}

/** One phone: IPA plus a glyph and text for the verdict (colour is a third cue, not the only one). */
export const VerdictChip = ({
  ipa,
  verdict,
  isSelected = false,
  onSelect,
}: VerdictChipProps): ReactElement => (
  <button
    type="button"
    className={cx('verdict-chip', verdictModifier(verdict), isSelected && 'is-selected')}
    onClick={onSelect}
    aria-pressed={isSelected}
    aria-label={`/${ipa}/ ${verdictLabel(verdict)}`}
  >
    <span className="verdict-chip__ipa">{ipa}</span>
    <span className="verdict-chip__mark" aria-hidden="true">
      {verdictGlyph(verdict)}
    </span>
  </button>
);
