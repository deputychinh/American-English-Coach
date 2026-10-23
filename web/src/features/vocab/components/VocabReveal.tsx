import type { ReactElement } from 'react';

import { VocabReview } from '@/enums/vocab.enum';
import { useCopy } from '@/hooks/useCopy';
import type { VocabItem } from '@/interfaces/vocab.interface';

import './VocabReveal.css';

interface VocabRevealProps {
  item: VocabItem;
}

/** The answer side of a card: the item, its IPA and meaning, and the example in context. */
export const VocabReveal = ({ item }: VocabRevealProps): ReactElement => {
  const copy = useCopy();
  return (
    <div className="vocab-reveal">
      <p className="vocab-reveal__text" lang="en">
        {item.text}
      </p>
      <p className="vocab-reveal__ipa">/{item.ipa}/</p>
      <p className="vocab-reveal__meaning">
        {item.meaning_vi}
        {item.review === VocabReview.Draft ? (
          <span className="vocab-reveal__draft">{copy.vocab.draftBadge}</span>
        ) : null}
      </p>
      {item.example.en !== item.text ? (
        <p className="vocab-reveal__example">
          <span lang="en">{item.example.en}</span>
          <span className="vocab-reveal__example-vi">{item.example.vi}</span>
        </p>
      ) : null}
    </div>
  );
};
