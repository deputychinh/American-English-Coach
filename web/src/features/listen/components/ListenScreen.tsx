'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { type ReactElement, useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/Button/Button';
import { ErrorState } from '@/components/ErrorState/ErrorState';
import { LessonHeader } from '@/components/LessonHeader/LessonHeader';
import { Skeleton } from '@/components/Skeleton/Skeleton';
import { Stat } from '@/components/Stat/Stat';
import { AsyncStatus } from '@/enums/async-status.enum';
import { ButtonVariant } from '@/enums/button-variant.enum';
import { getPairs, getSentences } from '@/features/content/services/content.service';
import { courseItemHref } from '@/features/course/services/course.service';
import { flattenUnits, getCurriculum } from '@/features/curriculum/services/curriculum.service';
import { ListenQuestionCard } from '@/features/listen/components/ListenQuestionCard';
import { buildQuestions, saveListenResult } from '@/features/listen/services/listen.service';
import { useReferenceAudio } from '@/features/practice/hooks/useReferenceAudio';
import { useAsync } from '@/hooks/useAsync';
import { useCopy } from '@/hooks/useCopy';
import { useFocusMode, useImmersive } from '@/hooks/useImmersive';
import type { CurriculumUnit, MinimalPair, Sentence } from '@/interfaces/practice.interface';

import './ListenScreen.css';

const loadAll = async (): Promise<{
  units: CurriculumUnit[];
  pairs: MinimalPair[];
  sentences: Sentence[];
}> => {
  const [curriculum, pairs, sentences] = await Promise.all([
    getCurriculum(),
    getPairs(),
    getSentences(),
  ]);
  return { units: flattenUnits(curriculum), pairs, sentences };
};

/** Listening step of a unit: one question at a time, instant feedback, a summary at the end. */
export const ListenScreen = (): ReactElement => {
  const copy = useCopy();
  const params = useSearchParams();
  const unitId = params.get('unit') ?? 'u01';
  const content = useAsync(loadAll);
  const audio = useReferenceAudio();
  useFocusMode();
  useImmersive();
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  const unit = content.data?.units.find((u) => u.id === unitId) ?? null;
  const questions = useMemo(
    () =>
      unit && content.data
        ? buildQuestions({ unit, pairs: content.data.pairs, sentences: content.data.sentences })
        : [],
    [unit, content.data],
  );
  const question = questions[index] ?? null;
  const { play } = audio;

  // After the first tap the next prompts play by themselves, like a listening test.
  useEffect(() => {
    if (hasInteracted && question && chosen === null) play(question.prompt);
  }, [hasInteracted, question, chosen, play]);

  if (content.status === AsyncStatus.Error) {
    return <ErrorState message={content.error ?? ''} onRetry={content.reload} />;
  }
  if (!content.data) return <Skeleton lines={6} />;
  if (!unit || questions.length === 0) {
    return <ErrorState message={copy.listen.noQuestions} />;
  }

  const choose = (option: number): void => {
    if (!question || chosen !== null) return;
    setChosen(option);
    if (option === question.answer) setCorrect((count) => count + 1);
  };
  const next = (): void => {
    if (index + 1 >= questions.length) {
      saveListenResult({
        unitId: unit.id,
        total: questions.length,
        correct,
        finishedAt: new Date().toISOString(),
      });
      setIsFinished(true);
      return;
    }
    setIndex(index + 1);
    setChosen(null);
  };
  const restart = (): void => {
    setIndex(0);
    setChosen(null);
    setCorrect(0);
    setIsFinished(false);
  };
  const controlled = unit.steps.find((step) => 'items' in step);
  const firstItem = controlled && 'items' in controlled ? controlled.items[0] : undefined;

  return (
    <div className="listen-screen">
      <LessonHeader
        closeHref="/curriculum"
        title={copy.listen.title}
        subtitle={unit.title_vi}
        progress={isFinished ? 1 : index / questions.length}
      />
      <div className="listen-screen__body">
        {isFinished ? (
          <section className="listen-screen__summary" aria-labelledby="listen-summary">
            <h2 id="listen-summary" className="listen-screen__summary-title">
              {copy.listen.summaryTitle}
            </h2>
            <div className="listen-screen__stats">
              <Stat
                label={copy.listen.accuracy}
                value={`${String(Math.round((correct / questions.length) * 100))}%`}
                tone={correct / questions.length >= 0.8 ? 'success' : 'warning'}
              />
              <Stat
                label={copy.listen.answered}
                value={`${String(correct)}/${String(questions.length)}`}
              />
            </div>
            <p className="listen-screen__advice">
              {correct / questions.length >= 0.8 ? copy.listen.adviceGood : copy.listen.adviceAgain}
            </p>
            <div className="listen-screen__actions">
              {firstItem ? (
                <Link href={courseItemHref(firstItem)} className="button button--primary">
                  {copy.listen.continuePractice}
                </Link>
              ) : null}
              <Button variant={ButtonVariant.Ghost} onClick={restart}>
                {copy.listen.again}
              </Button>
            </div>
          </section>
        ) : question ? (
          <ListenQuestionCard
            question={question}
            index={index}
            total={questions.length}
            chosen={chosen}
            isPlaying={audio.isPlaying}
            audioError={audio.error}
            onPlay={() => {
              setHasInteracted(true);
              play(question.prompt);
            }}
            onChoose={choose}
            onNext={next}
            isLast={index + 1 >= questions.length}
          />
        ) : null}
      </div>
    </div>
  );
};
