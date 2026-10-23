'use client';

import { type ReactElement, useEffect, useState } from 'react';

import { Button } from '@/components/Button/Button';
import { Icon } from '@/components/Icon/Icon';
import { SILENCE_MS_SENTENCE } from '@/constants/recorder.constant';
import { ButtonVariant } from '@/enums/button-variant.enum';
import { IconName } from '@/enums/icon-name.enum';
import { ReviewGrade } from '@/enums/review.enum';
import { TakePhase } from '@/enums/take-phase.enum';
import { lineKind } from '@/features/lesson/services/lesson-plan.service';
import { useReferenceAudio } from '@/features/practice/hooks/useReferenceAudio';
import { useScoredTake } from '@/features/practice/hooks/useScoredTake';
import { TalkMic } from '@/features/talk/components/TalkMic';
import { useCopy } from '@/hooks/useCopy';
import type { ScoreVerdict } from '@/interfaces/scoring.interface';
import type { PatternDrillItem } from '@/interfaces/talk.interface';
import { cx } from '@/utils/cx.util';
import { endingWord, gradeTransform, splitAround } from '@/utils/talk.util';

import './TalkCard.css';

interface TalkTransformCardProps {
  item: PatternDrillItem;
  onAnswer: (grade: ReviewGrade) => void;
}

const GRADE_CLASS: Record<ReviewGrade, string> = {
  [ReviewGrade.Again]: 'is-again',
  [ReviewGrade.Hard]: 'is-hard',
  [ReviewGrade.Good]: 'is-good',
  [ReviewGrade.Easy]: 'is-good',
};

const VERDICT_CLASS: Record<ScoreVerdict, string> = {
  ok: 'is-good',
  check: 'is-hard',
  error: 'is-again',
};

/**
 * "Change the sentence by voice": hear a sentence and a cue, say the changed sentence. The
 * scorer grades the target's phones and, for -s/-ed patterns, says whether the ending was heard.
 */
export const TalkTransformCard = ({ item, onAnswer }: TalkTransformCardProps): ReactElement => {
  const copy = useCopy();
  const reference = useReferenceAudio();
  const take = useScoredTake(SILENCE_MS_SENTENCE);
  const [hasGivenUp, setHasGivenUp] = useState(false);
  const { drill, pattern } = item;
  const { play } = reference;

  useEffect(() => {
    play(drill.prompt);
  }, [drill.prompt, play]);

  const scored = take.result ? gradeTransform(take.result, item) : null;
  const isOpen =
    !hasGivenUp &&
    (take.phase === TakePhase.Idle || take.isRecording || take.phase === TakePhase.Scoring);
  const grade = hasGivenUp ? ReviewGrade.Again : (scored?.grade ?? ReviewGrade.Again);
  const answer = splitAround(drill.answer, drill.target);
  const verdict =
    grade === ReviewGrade.Good
      ? copy.talk.gradeGood
      : grade === ReviewGrade.Hard
        ? copy.talk.gradeHard
        : copy.talk.gradeAgain;
  const endingName = pattern.ending ? copy.talk.ending[pattern.ending] : '';
  const word = endingWord(drill.target);
  const endingLines: Record<ScoreVerdict, string> = {
    ok: copy.talk.endingOk(endingName, word),
    check: copy.talk.endingCheck(endingName, word),
    error: copy.talk.endingError(endingName, word),
  };
  const endingLine = scored?.ending ? endingLines[scored.ending] : null;

  return (
    <section className="talk-card" aria-labelledby="talk-question">
      <p className="talk-card__eyebrow">{pattern.title_vi}</p>
      <p className="talk-card__rule">{pattern.rule_vi}</p>
      <h2 id="talk-question" className="talk-card__question">
        {copy.talk.transformQuestion}
      </h2>
      <div className="talk-card__prompt">
        <button
          type="button"
          className={cx('talk-card__play', reference.isPlaying && 'is-playing')}
          onClick={() => play(drill.prompt)}
          aria-label={copy.talk.play}
        >
          <Icon name={reference.isPlaying ? IconName.Volume : IconName.Play} />
        </button>
        <p className="talk-card__sentence" lang="en">
          {drill.prompt}
        </p>
      </div>
      <p className="talk-card__cue">
        {copy.talk.cue}: <span lang="en">{drill.cue}</span>
      </p>
      {reference.error ? <p className="talk-card__error">{reference.error}</p> : null}

      {isOpen ? (
        <div className="talk-card__actions">
          <TalkMic
            take={take}
            onToggle={() => {
              if (!take.isRecording) reference.stop();
              take.toggle({
                id: `talk:${item.id}`,
                text: drill.answer,
                kind: lineKind(drill.answer),
                title: pattern.title_en,
                focus: [],
              });
            }}
          />
          <Button
            variant={ButtonVariant.Ghost}
            disabled={take.phase !== TakePhase.Idle}
            onClick={() => setHasGivenUp(true)}
          >
            {copy.talk.dontKnow}
          </Button>
          {take.recorderError ? <p className="talk-card__error">{take.recorderError}</p> : null}
        </div>
      ) : (
        <>
          {take.phase === TakePhase.Failed && !hasGivenUp ? (
            <p className="talk-card__verdict is-hard" role="status">
              {copy.talk.scoreFailed}
              {take.error ? <span className="talk-card__error">{take.error}</span> : null}
            </p>
          ) : (
            <p className={cx('talk-card__verdict', GRADE_CLASS[grade])} role="status">
              {verdict}
              {endingLine && !hasGivenUp ? (
                <span className={cx('talk-card__ending', VERDICT_CLASS[scored?.ending ?? 'error'])}>
                  {endingLine}
                </span>
              ) : null}
            </p>
          )}
          <div className="talk-card__answer">
            <span className="talk-card__label">{copy.talk.answer}</span>
            <p className="talk-card__sentence" lang="en">
              {answer ? (
                <>
                  {answer.before}
                  <mark className="talk-card__target">{answer.match}</mark>
                  {answer.after}
                </>
              ) : (
                drill.answer
              )}
            </p>
            <p className="talk-card__hint">{drill.vi}</p>
          </div>
          <div className="talk-card__actions">
            <Button
              variant={ButtonVariant.Ghost}
              disabled={reference.isPlaying}
              onClick={() => play(drill.answer)}
            >
              <Icon name={IconName.Play} />
              {copy.talk.model}
            </Button>
            {take.phase === TakePhase.Failed && !hasGivenUp ? (
              <>
                <Button onClick={() => onAnswer(ReviewGrade.Good)}>{copy.talk.selfGood}</Button>
                <Button variant={ButtonVariant.Ghost} onClick={() => onAnswer(ReviewGrade.Again)}>
                  {copy.talk.selfAgain}
                </Button>
              </>
            ) : (
              <>
                {scored && !hasGivenUp && grade !== ReviewGrade.Good ? (
                  <Button variant={ButtonVariant.Ghost} onClick={() => onAnswer(ReviewGrade.Good)}>
                    {copy.talk.override}
                  </Button>
                ) : null}
                <Button onClick={() => onAnswer(grade)}>{copy.talk.next}</Button>
              </>
            )}
          </div>
        </>
      )}
    </section>
  );
};
