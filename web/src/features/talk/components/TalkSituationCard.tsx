'use client';

import { type ReactElement, useState } from 'react';

import { Button } from '@/components/Button/Button';
import { Icon } from '@/components/Icon/Icon';
import { SILENCE_MS_SENTENCE } from '@/constants/recorder.constant';
import { ButtonVariant } from '@/enums/button-variant.enum';
import { IconName } from '@/enums/icon-name.enum';
import { ReviewGrade } from '@/enums/review.enum';
import { TakePhase } from '@/enums/take-phase.enum';
import type { Register } from '@/enums/talk.enum';
import { lineKind } from '@/features/lesson/services/lesson-plan.service';
import { useReferenceAudio } from '@/features/practice/hooks/useReferenceAudio';
import { useScoredTake } from '@/features/practice/hooks/useScoredTake';
import { TalkMic } from '@/features/talk/components/TalkMic';
import { useCopy } from '@/hooks/useCopy';
import type { SituationItem } from '@/interfaces/talk.interface';
import { cx } from '@/utils/cx.util';
import { gradeFromVerdicts } from '@/utils/srs.util';
import { allVerdicts, gradeSituation, registerChoices } from '@/utils/talk.util';

import './TalkCard.css';

interface TalkSituationCardProps {
  item: SituationItem;
  onAnswer: (grade: ReviewGrade) => void;
}

/**
 * "Pick the phrase that fits": a situation, the function's phrase in three registers. After
 * the pick the learner says the right phrase; the pick is graded, the take only softens it.
 */
export const TalkSituationCard = ({ item, onAnswer }: TalkSituationCardProps): ReactElement => {
  const copy = useCopy();
  const reference = useReferenceAudio();
  const take = useScoredTake(SILENCE_MS_SENTENCE);
  const [chosen, setChosen] = useState<Register | null>(null);
  const phrase = item.fn.phrases[item.register];
  const isRight = chosen === item.register;
  const isBusy = take.isRecording || take.phase === TakePhase.Scoring;
  const registerName = copy.talk.register[item.register];
  const verdicts = take.result ? allVerdicts(take.result) : null;
  const isClear = verdicts !== null && gradeFromVerdicts(verdicts) === ReviewGrade.Good;
  const grade = gradeSituation(isRight, verdicts);

  return (
    <section className="talk-card" aria-labelledby="talk-question">
      <p className="talk-card__eyebrow">{item.fn.title_vi}</p>
      <p className="talk-card__situation">{item.fn.situations[item.register]}</p>
      <h2 id="talk-question" className="talk-card__question">
        {copy.talk.situationQuestion}
      </h2>
      <div className="talk-card__choices" role="group" aria-label={copy.talk.situationQuestion}>
        {registerChoices(item).map((register) => (
          <button
            key={register}
            type="button"
            lang="en"
            className={cx(
              'talk-card__choice',
              chosen !== null && register === item.register && 'is-correct',
              chosen === register && !isRight && 'is-wrong',
            )}
            disabled={chosen !== null}
            onClick={() => setChosen(register)}
          >
            {item.fn.phrases[register].en}
            {chosen !== null ? (
              <span className="talk-card__register" lang="vi">
                {copy.talk.register[register]}
              </span>
            ) : null}
          </button>
        ))}
      </div>
      {chosen !== null ? (
        <>
          <p className={cx('talk-card__verdict', isRight ? 'is-good' : 'is-again')} role="status">
            {isRight
              ? copy.talk.rightRegister(registerName)
              : copy.talk.wrongRegister(registerName)}
          </p>
          <p className="talk-card__hint">{phrase.vi}</p>
          <p className="talk-card__question">{copy.talk.sayIt}</p>
          <p className="talk-card__sentence" lang="en">
            {phrase.en}
          </p>
          <div className="talk-card__actions">
            <TalkMic
              take={take}
              onToggle={() => {
                if (!take.isRecording) reference.stop();
                take.toggle({
                  id: `talk:${item.id}`,
                  text: phrase.en,
                  kind: lineKind(phrase.en),
                  title: item.fn.title_en,
                  focus: [],
                });
              }}
            />
            {take.phase === TakePhase.Scored ? (
              <p className={cx('talk-card__feedback', isClear ? 'is-good' : 'is-hard')}>
                {isClear ? copy.talk.spokenGood : copy.talk.spokenHard}
              </p>
            ) : null}
            {take.phase === TakePhase.Failed && take.error ? (
              <p className="talk-card__error">{take.error}</p>
            ) : null}
            {take.recorderError ? <p className="talk-card__error">{take.recorderError}</p> : null}
            <Button
              variant={ButtonVariant.Ghost}
              disabled={reference.isPlaying || isBusy}
              onClick={() => reference.play(phrase.en)}
            >
              <Icon name={IconName.Play} />
              {copy.talk.model}
            </Button>
            <Button disabled={isBusy} onClick={() => onAnswer(grade)}>
              {copy.talk.next}
            </Button>
          </div>
        </>
      ) : null}
    </section>
  );
};
