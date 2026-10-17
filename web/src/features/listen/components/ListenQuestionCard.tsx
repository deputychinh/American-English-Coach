'use client';

import type { ReactElement } from 'react';

import { Button } from '@/components/Button/Button';
import { Icon } from '@/components/Icon/Icon';
import { IconName } from '@/enums/icon-name.enum';
import { useCopy } from '@/hooks/useCopy';
import type { ListenQuestionCardProps } from '@/interfaces/listening.interface';
import { cx } from '@/utils/cx.util';

import './ListenQuestionCard.css';

/** One question: a big play control, the options, then instant feedback and "next". */
export const ListenQuestionCard = ({
  question,
  index,
  total,
  chosen,
  isPlaying,
  audioError,
  onPlay,
  onChoose,
  onNext,
  isLast,
}: ListenQuestionCardProps): ReactElement => {
  const copy = useCopy();
  const isAnswered = chosen !== null;
  const isCorrect = chosen === question.answer;
  return (
    <section
      className={cx('listen-question-card', `listen-question-card--${question.kind}`)}
      aria-labelledby="listen-question"
    >
      <p className="listen-question-card__progress">{copy.listen.progress(index + 1, total)}</p>
      <button
        type="button"
        className={cx('listen-question-card__play', isPlaying && 'is-playing')}
        onClick={onPlay}
        aria-label={copy.listen.play}
      >
        <Icon name={isPlaying ? IconName.Volume : IconName.Play} />
      </button>
      {audioError ? <p className="listen-question-card__error">{audioError}</p> : null}
      <h2 id="listen-question" className="listen-question-card__question">
        {question.question}
      </h2>
      <div className="listen-question-card__options" role="group" aria-label={question.question}>
        {question.options.map((option, position) => {
          const isAnswer = position === question.answer;
          const state = !isAnswered
            ? ''
            : isAnswer
              ? 'is-correct'
              : position === chosen
                ? 'is-wrong'
                : 'is-dim';
          return (
            <button
              key={`${option}-${String(position)}`}
              type="button"
              className={cx('listen-question-card__option', state)}
              disabled={isAnswered}
              aria-pressed={position === chosen}
              onClick={() => onChoose(position)}
            >
              {option}
            </button>
          );
        })}
      </div>
      <p className="listen-question-card__feedback" role="status" aria-live="polite">
        {isAnswered
          ? isCorrect
            ? copy.listen.correct
            : copy.listen.wrong(question.options[question.answer] ?? '')
          : ''}
      </p>
      {isAnswered ? (
        <Button isFullWidth onClick={onNext}>
          {isLast ? copy.listen.finish : copy.listen.next}
        </Button>
      ) : null}
    </section>
  );
};
