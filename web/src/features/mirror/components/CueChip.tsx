import type { ReactElement } from 'react';

import type { VerdictDirection } from '@/interfaces/mouth-match.interface';
import { cx } from '@/utils/cx.util';

import './CueChip.css';

interface CueChipProps {
  text: string;
  direction: VerdictDirection;
}

/** The single correction shown over the video; the arrow says which way to move. */
export const CueChip = ({ text, direction }: CueChipProps): ReactElement => (
  <span className={cx('cue-chip', `cue-chip--${direction}`)}>
    <span className="cue-chip__arrow" aria-hidden="true">
      {direction === 'low' ? '↑' : direction === 'high' ? '↓' : '✓'}
    </span>
    {text}
  </span>
);
