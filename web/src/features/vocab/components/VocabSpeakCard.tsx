'use client';

import { type ReactElement, useState } from 'react';

import { Button } from '@/components/Button/Button';
import { Icon } from '@/components/Icon/Icon';
import { SILENCE_MS_SENTENCE, SILENCE_MS_WORD } from '@/constants/recorder.constant';
import { ButtonVariant } from '@/enums/button-variant.enum';
import { IconName } from '@/enums/icon-name.enum';
import { ReviewGrade, ReviewMode } from '@/enums/review.enum';
import { TakePhase } from '@/enums/take-phase.enum';
import { VocabKind } from '@/enums/vocab.enum';
import { useReferenceAudio } from '@/features/practice/hooks/useReferenceAudio';
import { useScoredTake } from '@/features/practice/hooks/useScoredTake';
import { VocabReveal } from '@/features/vocab/components/VocabReveal';
import { useCopy } from '@/hooks/useCopy';
import type { PracticeItem } from '@/interfaces/practice.interface';
import type { VocabItem } from '@/interfaces/vocab.interface';
import { cx } from '@/utils/cx.util';
import { gradeFromVerdicts } from '@/utils/srs.util';
import { clozeOf, targetVerdicts } from '@/utils/vocab.util';

import './VocabCard.css';

interface VocabSpeakCardProps {
  item: VocabItem;
  mode: ReviewMode.Speak | ReviewMode.Cloze;
  onAnswer: (grade: ReviewGrade) => void;
}

type Phase = 'ask' | 'recording' | 'scoring' | 'graded' | 'failed' | 'forgot';

const PHASE_OF_TAKE: Record<TakePhase, Phase> = {
  [TakePhase.Idle]: 'ask',
  [TakePhase.Recording]: 'recording',
  [TakePhase.Scoring]: 'scoring',
  [TakePhase.Scored]: 'graded',
  [TakePhase.Failed]: 'failed',
};

const practiceItem = (item: VocabItem, mode: ReviewMode, text: string): PracticeItem => ({
  id: `vocab:${item.id}:${mode}`,
  text,
  kind:
    mode === ReviewMode.Speak && item.kind === VocabKind.Word
      ? 'word'
      : text.trim().endsWith('?')
        ? 'question'
        : 'statement',
  title: item.text,
  focus: [],
});

/**
 * Say the item from its meaning (or the whole example, filling the gap). The phoneme scorer
 * grades the item's own sounds; the learner can overrule a wrong verdict, and grades
 * themselves when a take cannot be scored.
 */
export const VocabSpeakCard = ({ item, mode, onAnswer }: VocabSpeakCardProps): ReactElement => {
  const copy = useCopy();
  const reference = useReferenceAudio();
  const cloze = mode === ReviewMode.Cloze ? clozeOf(item) : null;
  const spoken = cloze ? item.example.en : item.text;
  const take = useScoredTake(
    cloze || item.kind === VocabKind.Chunk ? SILENCE_MS_SENTENCE : SILENCE_MS_WORD,
  );
  const [hasForgotten, setHasForgotten] = useState(false);
  const phase: Phase = hasForgotten ? 'forgot' : PHASE_OF_TAKE[take.phase];
  const grade = hasForgotten
    ? ReviewGrade.Again
    : take.result
      ? gradeFromVerdicts(targetVerdicts(take.result, item.text))
      : null;
  const { error, isRecording } = take;
  const onMic = (): void => {
    if (!isRecording) reference.stop();
    take.toggle(practiceItem(item, mode, spoken));
  };
  const isOpen = phase === 'ask' || phase === 'recording' || phase === 'scoring';
  const verdict =
    grade === ReviewGrade.Good
      ? copy.vocab.gradeGood
      : grade === ReviewGrade.Hard
        ? copy.vocab.gradeHard
        : copy.vocab.gradeAgain;

  return (
    <section className="vocab-card" aria-labelledby="vocab-question">
      <h2 id="vocab-question" className="vocab-card__question">
        {cloze ? copy.vocab.clozeQuestion : copy.vocab.speakQuestion}
      </h2>
      {cloze ? (
        <p className="vocab-card__cloze" lang="en">
          {cloze.before}
          <span className="vocab-card__gap" aria-label="…">
            {isOpen ? '____' : item.text}
          </span>
          {cloze.after}
        </p>
      ) : (
        <p className="vocab-card__meaning">{item.meaning_vi}</p>
      )}
      <p className="vocab-card__hint">{item.example.vi}</p>

      {isOpen ? (
        <div className="vocab-card__controls">
          <button
            type="button"
            className={cx('vocab-card__mic', isRecording && 'is-recording')}
            disabled={phase === 'scoring'}
            onClick={onMic}
          >
            <Icon name={isRecording ? IconName.Stop : IconName.Practice} />
            <span>
              {phase === 'scoring'
                ? copy.vocab.scoring
                : isRecording
                  ? copy.vocab.stop
                  : copy.vocab.record}
            </span>
          </button>
          <Button
            variant={ButtonVariant.Ghost}
            disabled={phase !== 'ask'}
            onClick={() => setHasForgotten(true)}
          >
            {copy.vocab.forgot}
          </Button>
          {take.recorderError ? <p className="vocab-card__error">{take.recorderError}</p> : null}
        </div>
      ) : (
        <>
          {phase === 'graded' ? (
            <p
              className={cx(
                'vocab-card__verdict',
                grade === ReviewGrade.Good
                  ? 'is-good'
                  : grade === ReviewGrade.Hard
                    ? 'is-hard'
                    : 'is-again',
              )}
              role="status"
            >
              {verdict}
            </p>
          ) : phase === 'failed' ? (
            <p className="vocab-card__verdict is-hard" role="status">
              {copy.vocab.scoreFailed}
              {error ? <span className="vocab-card__error">{error}</span> : null}
            </p>
          ) : null}
          <VocabReveal item={item} />
          <div className="vocab-card__actions">
            <Button
              variant={ButtonVariant.Ghost}
              disabled={reference.isPlaying}
              onClick={() => reference.play(spoken)}
            >
              <Icon name={IconName.Play} />
              {copy.vocab.model}
            </Button>
            {phase === 'failed' ? (
              <>
                <Button onClick={() => onAnswer(ReviewGrade.Good)}>
                  {copy.vocab.selfRemembered}
                </Button>
                <Button variant={ButtonVariant.Ghost} onClick={() => onAnswer(ReviewGrade.Again)}>
                  {copy.vocab.selfForgot}
                </Button>
              </>
            ) : (
              <>
                {phase === 'graded' && grade !== ReviewGrade.Good ? (
                  <Button variant={ButtonVariant.Ghost} onClick={() => onAnswer(ReviewGrade.Good)}>
                    {copy.vocab.override}
                  </Button>
                ) : null}
                <Button onClick={() => onAnswer(grade ?? ReviewGrade.Again)}>
                  {copy.vocab.next}
                </Button>
              </>
            )}
          </div>
        </>
      )}
    </section>
  );
};
