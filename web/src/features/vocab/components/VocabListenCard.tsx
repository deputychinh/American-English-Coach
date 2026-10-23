'use client';

import { type ReactElement, useEffect, useState } from 'react';

import { Button } from '@/components/Button/Button';
import { Icon } from '@/components/Icon/Icon';
import { IconName } from '@/enums/icon-name.enum';
import { ReviewGrade } from '@/enums/review.enum';
import { useReferenceAudio } from '@/features/practice/hooks/useReferenceAudio';
import { VocabReveal } from '@/features/vocab/components/VocabReveal';
import { useCopy } from '@/hooks/useCopy';
import type { VocabItem } from '@/interfaces/vocab.interface';
import { cx } from '@/utils/cx.util';

import './VocabCard.css';

interface VocabListenCardProps {
  item: VocabItem;
  choices: string[];
  onAnswer: (grade: ReviewGrade) => void;
}

/** Hear the item, pick its meaning; right first time is "good", wrong is "again". */
export const VocabListenCard = ({
  item,
  choices,
  onAnswer,
}: VocabListenCardProps): ReactElement => {
  const copy = useCopy();
  const audio = useReferenceAudio();
  const [chosen, setChosen] = useState<string | null>(null);
  const { play } = audio;

  useEffect(() => {
    play(item.text);
  }, [item.text, play]);

  const isAnswered = chosen !== null;
  const isRight = chosen === item.meaning_vi;

  return (
    <section className="vocab-card" aria-labelledby="vocab-question">
      <button
        type="button"
        className={cx('vocab-card__play', audio.isPlaying && 'is-playing')}
        onClick={() => play(item.text)}
        aria-label={copy.vocab.play}
      >
        <Icon name={audio.isPlaying ? IconName.Volume : IconName.Play} />
      </button>
      {audio.error ? <p className="vocab-card__error">{audio.error}</p> : null}
      <h2 id="vocab-question" className="vocab-card__question">
        {copy.vocab.listenQuestion}
      </h2>
      <div className="vocab-card__choices" role="group" aria-label={copy.vocab.listenQuestion}>
        {choices.map((choice) => (
          <button
            key={choice}
            type="button"
            className={cx(
              'vocab-card__choice',
              isAnswered && choice === item.meaning_vi && 'is-correct',
              isAnswered && choice === chosen && !isRight && 'is-wrong',
            )}
            disabled={isAnswered}
            onClick={() => setChosen(choice)}
          >
            {choice}
          </button>
        ))}
      </div>
      {isAnswered ? (
        <>
          <p className={cx('vocab-card__verdict', isRight ? 'is-good' : 'is-again')} role="status">
            {isRight ? copy.vocab.correct : copy.vocab.wrong}
          </p>
          <VocabReveal item={item} />
          <Button
            isFullWidth
            onClick={() => onAnswer(isRight ? ReviewGrade.Good : ReviewGrade.Again)}
          >
            {copy.vocab.next}
          </Button>
        </>
      ) : null}
    </section>
  );
};
