import Link from 'next/link';
import type { ReactElement } from 'react';

import { useCopy } from '@/hooks/useCopy';
import type { MinimalPair, Sentence } from '@/interfaces/practice.interface';

import './PracticeList.css';

interface PracticeListProps {
  pairs: MinimalPair[];
  sentences: Sentence[];
}

export const PracticeList = ({ pairs, sentences }: PracticeListProps): ReactElement => {
  const copy = useCopy();
  const kindLabel = copy.practice.kind as Record<string, string>;
  return (
    <div className="practice-list">
      <section aria-labelledby="pairs-title">
        <h2 id="pairs-title" className="practice-list__heading">
          {copy.practice.pairs}
        </h2>
        <ul className="practice-list__grid">
          {pairs.map((pair) => (
            <li key={pair.id} className="practice-list__card">
              <span className="practice-list__title">{pair.title_vi}</span>
              <span className="practice-list__words">
                {pair.words.map((word, index) => (
                  <Link
                    key={word}
                    href={{
                      pathname: '/practice',
                      query: { item: `pair:${pair.id}:${String(index)}` },
                    }}
                    className="practice-list__word"
                  >
                    {word}
                  </Link>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </section>
      <section id="sentences" aria-labelledby="sentences-title">
        <h2 id="sentences-title" className="practice-list__heading">
          {copy.practice.sentences}
        </h2>
        <ul className="practice-list__grid">
          {sentences.map((sentence) => (
            <li key={sentence.id} className="practice-list__card">
              <span className="practice-list__title">{sentence.title_vi}</span>
              <Link
                href={{ pathname: '/practice', query: { item: `sentence:${sentence.id}` } }}
                className="practice-list__sentence"
              >
                {sentence.text}
              </Link>
              <span className="practice-list__kind">
                {kindLabel[sentence.kind] ?? sentence.kind}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};
