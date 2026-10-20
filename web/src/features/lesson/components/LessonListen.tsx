'use client';

import { type ReactElement, useEffect, useState } from 'react';

import { ListenQuestionCard } from '@/features/listen/components/ListenQuestionCard';
import { useReferenceAudio } from '@/features/practice/hooks/useReferenceAudio';
import type { LessonListenStep } from '@/interfaces/lesson.interface';

interface LessonListenProps {
  step: LessonListenStep;
  index: number;
  onAnswered: (isCorrect: boolean) => void;
}

/** Step 2: the unit's listening questions, one per screen, the prompt playing by itself. */
export const LessonListen = ({
  step,
  index,
  onAnswered,
}: LessonListenProps): ReactElement | null => {
  const audio = useReferenceAudio();
  const [chosen, setChosen] = useState<number | null>(null);
  const question = step.questions[index] ?? null;
  const { play } = audio;

  // The learner tapped "start listening" a moment ago, so autoplay is allowed.
  useEffect(() => {
    if (question) play(question.prompt);
  }, [question, play]);

  if (!question) return null;
  return (
    <ListenQuestionCard
      key={question.id}
      question={question}
      index={index}
      total={step.questions.length}
      chosen={chosen}
      isPlaying={audio.isPlaying}
      audioError={audio.error}
      onPlay={() => play(question.prompt)}
      onChoose={(option) => {
        if (chosen === null) setChosen(option);
      }}
      onNext={() => {
        setChosen(null);
        onAnswered(chosen === question.answer);
      }}
      isLast={index + 1 >= step.questions.length}
    />
  );
};
