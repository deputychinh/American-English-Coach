import type { ReactElement } from 'react';

import { useCopy } from '@/hooks/useCopy';
import type { ProsodyResult } from '@/interfaces/practice.interface';
import { cx } from '@/utils/cx.util';
import { verdictGlyph, verdictModifier } from '@/utils/verdict.util';

import './ProsodyList.css';

interface ProsodyListProps {
  findings: ProsodyResult[];
}

export const ProsodyList = ({ findings }: ProsodyListProps): ReactElement | null => {
  const copy = useCopy();
  if (findings.length === 0) return null;
  return (
    <div className="prosody-list">
      <h3 className="prosody-list__title">{copy.practice.prosodyTitle}</h3>
      <ul className="prosody-list__items">
        {findings.map((finding, index) => (
          <li
            key={`${finding.aspect}-${String(finding.word_index ?? index)}`}
            className={cx('prosody-list__item', verdictModifier(finding.verdict))}
          >
            <span className="prosody-list__aspect">
              <span aria-hidden="true">{verdictGlyph(finding.verdict)}</span>{' '}
              {copy.prosody[finding.aspect]}
            </span>
            <span>{finding.detail_vi}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
