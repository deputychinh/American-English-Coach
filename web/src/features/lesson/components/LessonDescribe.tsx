'use client';

import type { ReactElement } from 'react';

import { ArticulationDiagram } from '@/components/ArticulationDiagram/ArticulationDiagram';
import { Button } from '@/components/Button/Button';
import { ButtonVariant } from '@/enums/button-variant.enum';
import { useReferenceAudio } from '@/features/practice/hooks/useReferenceAudio';
import { useCopy } from '@/hooks/useCopy';
import type { LessonDescribeStep } from '@/interfaces/lesson.interface';

import './LessonDescribe.css';

interface LessonDescribeProps {
  step: LessonDescribeStep;
  onNext: () => void;
}

/** Step 1: each sound with its tip and two words to hear, then the unit's notes. */
export const LessonDescribe = ({ step, onNext }: LessonDescribeProps): ReactElement => {
  const copy = useCopy();
  const audio = useReferenceAudio();
  return (
    <section className="lesson-describe" aria-label={copy.lesson.steps.describe}>
      <p className="lesson-describe__lead">{copy.lesson.describeLead}</p>
      <ul className="lesson-describe__cards">
        {step.cards.map((card) => (
          <li key={card.id} className="lesson-describe__card">
            <p className="lesson-describe__ipa">/{card.us}/</p>
            <ArticulationDiagram soundId={card.id} isCompact />
            <p className="lesson-describe__tip">{card.tip}</p>
            <div className="lesson-describe__listen">
              <Button
                variant={ButtonVariant.Secondary}
                isSmall
                disabled={audio.isPlaying}
                onClick={() => audio.play(card.example)}
              >
                {copy.lesson.listen(card.example)}
              </Button>
              <Button
                variant={ButtonVariant.Ghost}
                isSmall
                disabled={audio.isPlaying}
                onClick={() => audio.play(card.contrast)}
              >
                {copy.lesson.contrast}: {card.contrast}
              </Button>
            </div>
          </li>
        ))}
      </ul>
      <p className="lesson-describe__notes">{step.notes}</p>
      {audio.error ? (
        <p className="lesson-describe__error" role="alert">
          {audio.error}
        </p>
      ) : null}
      <div className="lesson-describe__cta">
        <Button isFullWidth onClick={onNext}>
          {copy.lesson.startListening}
        </Button>
      </div>
    </section>
  );
};
