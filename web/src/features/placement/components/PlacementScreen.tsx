'use client';

import { type ReactElement, useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/Button/Button';
import { ErrorState } from '@/components/ErrorState/ErrorState';
import { LessonHeader } from '@/components/LessonHeader/LessonHeader';
import { Skeleton } from '@/components/Skeleton/Skeleton';
import { AsyncStatus } from '@/enums/async-status.enum';
import { ButtonVariant } from '@/enums/button-variant.enum';
import { Language } from '@/enums/language.enum';
import { getPairs, getSentences, getSounds } from '@/features/content/services/content.service';
import { getCurriculum } from '@/features/curriculum/services/curriculum.service';
import { ListenQuestionCard } from '@/features/listen/components/ListenQuestionCard';
import { PlacementResultCard } from '@/features/placement/components/PlacementResultCard';
import {
  buildPlacement,
  buildSpeaking,
  placeLearner,
  savePlacement,
} from '@/features/placement/services/placement.service';
import { PracticeSession } from '@/features/practice/components/PracticeSession';
import { useReferenceAudio } from '@/features/practice/hooks/useReferenceAudio';
import { useAsync } from '@/hooks/useAsync';
import { useCopy, useLanguage } from '@/hooks/useCopy';
import { useFocusMode, useImmersive } from '@/hooks/useImmersive';
import type { PlacementResult } from '@/interfaces/listening.interface';
import type {
  AssessmentResponse,
  CurriculumResponse,
  MinimalPair,
  Sentence,
  SoundDrillSummary,
} from '@/interfaces/practice.interface';

import './PlacementScreen.css';

const loadAll = async (): Promise<{
  curriculum: CurriculumResponse;
  pairs: MinimalPair[];
  sentences: Sentence[];
  sounds: SoundDrillSummary[];
}> => {
  const [curriculum, pairs, sentences, sounds] = await Promise.all([
    getCurriculum(),
    getPairs(),
    getSentences(),
    getSounds(),
  ]);
  return { curriculum, pairs, sentences, sounds };
};

type Phase = 'intro' | 'listen' | 'speakIntro' | 'speak' | 'result';

/** Placement check: listening from every level, an optional speaking part, then the level. */
export const PlacementScreen = (): ReactElement => {
  const copy = useCopy();
  const language = useLanguage();
  useFocusMode();
  useImmersive();
  const content = useAsync(loadAll);
  const audio = useReferenceAudio();
  const [phase, setPhase] = useState<Phase>('intro');
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [spoken, setSpoken] = useState<{ level: string; result: AssessmentResponse }[]>([]);
  const [spokenIndex, setSpokenIndex] = useState(0);
  const [result, setResult] = useState<PlacementResult | null>(null);
  const levels = useMemo(() => content.data?.curriculum.levels ?? [], [content.data]);
  const questions = useMemo(
    () =>
      content.data
        ? buildPlacement({ levels, pairs: content.data.pairs, sentences: content.data.sentences })
        : [],
    [content.data, levels],
  );
  const speaking = useMemo(
    () => (content.data ? buildSpeaking({ levels, sentences: content.data.sentences }) : []),
    [content.data, levels],
  );
  const question = questions[index] ?? null;
  const chosen = question ? (answers[question.id] ?? null) : null;
  const { play } = audio;

  useEffect(() => {
    if (phase === 'listen' && question && chosen === null) play(question.prompt);
  }, [phase, question, chosen, play]);

  if (content.status === AsyncStatus.Error)
    return <ErrorState message={content.error ?? ''} onRetry={content.reload} />;
  if (!content.data) return <Skeleton lines={6} />;

  const finish = (takes: { level: string; result: AssessmentResponse }[]): void => {
    const placed = placeLearner({ levels, questions, answers, spoken: takes });
    savePlacement(placed);
    setResult(placed);
    setPhase('result');
  };
  const next = (): void => {
    if (index + 1 < questions.length) {
      setIndex(index + 1);
      return;
    }
    // A prompt still downloading would play over the speaking part (and the microphone's echo
    // cancellation would then erase the learner's voice).
    audio.stop();
    setPhase('speakIntro');
  };
  const nextSentence = (): void => {
    if (spokenIndex + 1 < speaking.length) setSpokenIndex(spokenIndex + 1);
    else finish(spoken);
  };
  const restart = (): void => {
    setAnswers({});
    setSpoken([]);
    setIndex(0);
    setSpokenIndex(0);
    setResult(null);
    setPhase('listen');
  };
  const titleOf = (id: string): string => {
    const level = levels.find((item) => item.id === id);
    if (!level) return id;
    return copy.curriculum.levelTitle(
      level.id,
      language === Language.En ? level.title_en : level.title_vi,
    );
  };

  const sentence = speaking[spokenIndex];
  if (phase === 'speak' && sentence) {
    const isTried = spoken.some((take) => take.result.item_id === sentence.item.id);
    return (
      <PracticeSession
        key={sentence.item.id}
        item={sentence.item}
        closeHref="/"
        progress={(questions.length + spokenIndex) / (questions.length + speaking.length)}
        onResult={(response) =>
          setSpoken((takes) => [
            ...takes.filter((take) => take.result.item_id !== sentence.item.id),
            { level: sentence.level, result: response },
          ])
        }
        onSwipeNext={nextSentence}
        banner={
          <p className="placement-screen__banner">
            {copy.placement.speakTitle} ·{' '}
            {copy.placement.sentenceOf(spokenIndex + 1, speaking.length)}
          </p>
        }
        extraActions={
          <Button
            variant={isTried ? ButtonVariant.Primary : ButtonVariant.Ghost}
            isSmall
            onClick={nextSentence}
          >
            {isTried ? copy.lesson.next : copy.lesson.skip}
          </Button>
        }
      />
    );
  }

  return (
    <div className="placement-screen">
      <LessonHeader
        closeHref="/"
        title={copy.placement.title}
        progress={
          phase === 'result'
            ? 1
            : phase === 'listen'
              ? index / Math.max(1, questions.length + speaking.length)
              : phase === 'intro'
                ? 0
                : questions.length / Math.max(1, questions.length + speaking.length)
        }
      />
      <div className="placement-screen__body">
        {phase === 'intro' ? (
          <section className="placement-screen__card">
            <p className="placement-screen__lead">{copy.placement.lead}</p>
            <p className="placement-screen__muted">{copy.placement.howTo}</p>
            <Button isFullWidth onClick={() => setPhase('listen')}>
              {copy.placement.start}
            </Button>
          </section>
        ) : phase === 'speakIntro' ? (
          <section className="placement-screen__card" aria-labelledby="placement-speak">
            <h2 id="placement-speak" className="placement-screen__lead">
              {copy.placement.speakTitle}
            </h2>
            <p className="placement-screen__muted">{copy.placement.speakLead}</p>
            <Button isFullWidth onClick={() => setPhase('speak')}>
              {copy.placement.speakStart}
            </Button>
            <Button variant={ButtonVariant.Ghost} isFullWidth onClick={() => finish([])}>
              {copy.placement.speakSkip}
            </Button>
          </section>
        ) : phase === 'result' && result ? (
          <PlacementResultCard
            result={result}
            levels={levels}
            sounds={content.data.sounds}
            titleOf={titleOf}
            onRetake={restart}
          />
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
