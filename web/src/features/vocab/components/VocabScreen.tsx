'use client';

import Link from 'next/link';
import { type ReactElement, useCallback, useMemo, useState } from 'react';

import { Button } from '@/components/Button/Button';
import { ErrorState } from '@/components/ErrorState/ErrorState';
import { LessonHeader } from '@/components/LessonHeader/LessonHeader';
import { Skeleton } from '@/components/Skeleton/Skeleton';
import { Stat } from '@/components/Stat/Stat';
import { AsyncStatus } from '@/enums/async-status.enum';
import { ReviewGrade, ReviewMode } from '@/enums/review.enum';
import { VocabReview } from '@/enums/vocab.enum';
import { answerCard } from '@/features/review/services/review.service';
import { VocabListenCard } from '@/features/vocab/components/VocabListenCard';
import { VocabSpeakCard } from '@/features/vocab/components/VocabSpeakCard';
import { loadVocabState } from '@/features/vocab/services/vocab.service';
import { useAsync } from '@/hooks/useAsync';
import { useCopy } from '@/hooks/useCopy';
import { useFocusMode, useImmersive } from '@/hooks/useImmersive';
import type { VocabTurn } from '@/interfaces/vocab.interface';
import { meaningChoices } from '@/utils/vocab.util';

import './VocabScreen.css';

/** Vocabulary: what is due today, then one card at a time, then a short summary. */
export const VocabScreen = (): ReactElement => {
  const copy = useCopy();
  const load = useCallback(() => loadVocabState(), []);
  const state = useAsync(load);
  const [turns, setTurns] = useState<VocabTurn[] | null>(null);
  const [index, setIndex] = useState(0);
  const [good, setGood] = useState(0);
  const [saveError, setSaveError] = useState<string | null>(null);
  useFocusMode();
  useImmersive();

  const items = useMemo(() => state.data?.items ?? [], [state.data]);
  const hasDrafts = items.some((item) => item.review === VocabReview.Draft);

  if (state.status === AsyncStatus.Error) {
    return <ErrorState message={state.error ?? ''} onRetry={state.reload} />;
  }
  if (!state.data) return <Skeleton lines={6} />;
  const { overview } = state.data;

  const begin = (): void => {
    setTurns(overview.turns);
    setIndex(0);
    setGood(0);
  };
  const close = (): void => {
    setTurns(null);
    state.reload();
  };
  const answer = (grade: ReviewGrade): void => {
    const turn = turns?.[index];
    if (!turn) return;
    setSaveError(null);
    answerCard(turn.card, grade)
      .then(() => {
        if (grade >= ReviewGrade.Good) setGood((count) => count + 1);
        setIndex((value) => value + 1);
      })
      .catch((cause: unknown) => setSaveError(cause instanceof Error ? cause.message : ''));
  };

  if (turns) {
    const turn = turns[index] ?? null;
    return (
      <div className="vocab-screen">
        <LessonHeader
          closeHref="/vocab"
          title={copy.vocab.title}
          subtitle={turn ? copy.vocab.progress(index + 1, turns.length) : undefined}
          progress={turns.length > 0 ? index / turns.length : 1}
        />
        <div className="vocab-screen__body">
          {turn ? (
            <>
              {turn.isNew ? <span className="vocab-screen__new">{copy.vocab.newBadge}</span> : null}
              {turn.card.mode === ReviewMode.Listen ? (
                <VocabListenCard
                  key={turn.card.id}
                  item={turn.item}
                  choices={meaningChoices(turn.item, items)}
                  onAnswer={answer}
                />
              ) : (
                <VocabSpeakCard
                  key={turn.card.id}
                  item={turn.item}
                  mode={turn.card.mode === ReviewMode.Cloze ? ReviewMode.Cloze : ReviewMode.Speak}
                  onAnswer={answer}
                />
              )}
              {saveError !== null ? <p className="vocab-screen__error">{saveError}</p> : null}
            </>
          ) : (
            <section className="vocab-screen__summary" aria-labelledby="vocab-summary">
              <h2 id="vocab-summary" className="vocab-screen__title">
                {copy.vocab.summaryTitle}
              </h2>
              <p className="vocab-screen__lead">{copy.vocab.summaryLine(good, turns.length)}</p>
              <Button isFullWidth onClick={close}>
                {copy.vocab.summaryMore}
              </Button>
              <Link href="/" className="button button--ghost">
                {copy.vocab.backHome}
              </Link>
            </section>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="vocab-screen">
      <LessonHeader closeHref="/" title={copy.vocab.title} />
      <div className="vocab-screen__body">
        <p className="vocab-screen__lead">{copy.vocab.lead}</p>
        <div className="vocab-screen__stats">
          <Stat label={copy.vocab.due} value={String(overview.due)} />
          <Stat label={copy.vocab.fresh} value={String(overview.fresh)} />
          <Stat
            label={copy.vocab.remembered}
            value={String(overview.remembered)}
            tone={overview.remembered > 0 ? 'success' : 'neutral'}
          />
        </div>
        <p className="vocab-screen__note">
          {copy.vocab.rememberedHint(overview.started, overview.total)}
        </p>
        {overview.newPaused ? <p className="vocab-screen__note">{copy.vocab.paused}</p> : null}
        {overview.turns.length > 0 ? (
          <Button isFullWidth onClick={begin}>
            {copy.vocab.start(overview.turns.length)}
          </Button>
        ) : (
          <p className="vocab-screen__done" role="status">
            {copy.vocab.allDone}
          </p>
        )}
        {hasDrafts ? <p className="vocab-screen__note">{copy.vocab.draftNote}</p> : null}
        <Link href="/" className="button button--ghost">
          {copy.vocab.backHome}
        </Link>
      </div>
    </div>
  );
};
