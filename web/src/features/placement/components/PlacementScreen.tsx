'use client';

import Link from 'next/link';
import { type ReactElement, useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/Button/Button';
import { ErrorState } from '@/components/ErrorState/ErrorState';
import { LessonHeader } from '@/components/LessonHeader/LessonHeader';
import { Skeleton } from '@/components/Skeleton/Skeleton';
import { AsyncStatus } from '@/enums/async-status.enum';
import { ButtonVariant } from '@/enums/button-variant.enum';
import { Language } from '@/enums/language.enum';
import { getPairs, getSentences } from '@/features/content/services/content.service';
import { getCurriculum } from '@/features/curriculum/services/curriculum.service';
import { ListenQuestionCard } from '@/features/listen/components/ListenQuestionCard';
import {
  buildPlacement,
  placeLearner,
  savePlacement,
} from '@/features/placement/services/placement.service';
import { useReferenceAudio } from '@/features/practice/hooks/useReferenceAudio';
import { useAsync } from '@/hooks/useAsync';
import { useCopy, useLanguage } from '@/hooks/useCopy';
import { useFocusMode, useImmersive } from '@/hooks/useImmersive';
import type { PlacementResult } from '@/interfaces/listening.interface';
import type { CurriculumResponse, MinimalPair, Sentence } from '@/interfaces/practice.interface';

import './PlacementScreen.css';

const loadAll = async (): Promise<{
  curriculum: CurriculumResponse;
  pairs: MinimalPair[];
  sentences: Sentence[];
}> => {
  const [curriculum, pairs, sentences] = await Promise.all([
    getCurriculum(),
    getPairs(),
    getSentences(),
  ]);
  return { curriculum, pairs, sentences };
};

/** Placement check: listening questions from every level, then the level to start at. */
export const PlacementScreen = (): ReactElement => {
  const copy = useCopy();
  const language = useLanguage();
  useFocusMode();
  useImmersive();
  const content = useAsync(loadAll);
  const audio = useReferenceAudio();
  const [isStarted, setIsStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<PlacementResult | null>(null);
  const levels = useMemo(() => content.data?.curriculum.levels ?? [], [content.data]);
  const questions = useMemo(
    () =>
      content.data
        ? buildPlacement({ levels, pairs: content.data.pairs, sentences: content.data.sentences })
        : [],
    [content.data, levels],
  );
  const question = questions[index] ?? null;
  const chosen = question ? (answers[question.id] ?? null) : null;
  const { play } = audio;

  useEffect(() => {
    if (isStarted && question && chosen === null) play(question.prompt);
  }, [isStarted, question, chosen, play]);

  if (content.status === AsyncStatus.Error)
    return <ErrorState message={content.error ?? ''} onRetry={content.reload} />;
  if (!content.data) return <Skeleton lines={6} />;

  const next = (): void => {
    if (index + 1 < questions.length) {
      setIndex(index + 1);
      return;
    }
    const placed = placeLearner({ levels, questions, answers });
    savePlacement(placed);
    setResult(placed);
  };
  const restart = (): void => {
    setAnswers({});
    setIndex(0);
    setResult(null);
  };
  const titleOf = (id: string): string => {
    const level = levels.find((item) => item.id === id);
    if (!level) return id;
    return copy.curriculum.levelTitle(
      level.id,
      language === Language.En ? level.title_en : level.title_vi,
    );
  };

  return (
    <div className="placement-screen">
      <LessonHeader
        closeHref="/"
        title={copy.placement.title}
        progress={result ? 1 : isStarted ? index / Math.max(1, questions.length) : 0}
      />
      <div className="placement-screen__body">
        {!isStarted ? (
          <section className="placement-screen__card">
            <p className="placement-screen__lead">{copy.placement.lead}</p>
            <p className="placement-screen__muted">{copy.placement.howTo}</p>
            <Button isFullWidth onClick={() => setIsStarted(true)}>
              {copy.placement.start}
            </Button>
          </section>
        ) : result ? (
          <section className="placement-screen__card" aria-labelledby="placement-result">
            <h2 id="placement-result" className="placement-screen__muted">
              {copy.placement.resultTitle}
            </h2>
            <p className="placement-screen__level">{titleOf(result.level)}</p>
            <ul className="placement-screen__scores">
              {levels.map((level) => (
                <li key={level.id} className="placement-screen__score">
                  {copy.placement.levelLine(
                    titleOf(level.id),
                    Math.round((result.scores[level.id] ?? 0) * 100),
                  )}
                </li>
              ))}
            </ul>
            <Link href="/" className="button button--primary button--full-width">
              {copy.placement.goPath}
            </Link>
            <Button variant={ButtonVariant.Ghost} isFullWidth onClick={restart}>
              {copy.placement.retake}
            </Button>
          </section>
        ) : question ? (
          <ListenQuestionCard
            question={question}
            index={index}
            total={questions.length}
            chosen={chosen}
            isPlaying={audio.isPlaying}
            audioError={audio.error}
            onPlay={() => play(question.prompt)}
            onChoose={(option) => setAnswers({ ...answers, [question.id]: option })}
            onNext={next}
            isLast={index + 1 >= questions.length}
          />
        ) : null}
      </div>
    </div>
  );
};
