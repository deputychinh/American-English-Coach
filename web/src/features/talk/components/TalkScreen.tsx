'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { type ReactElement, useCallback, useState } from 'react';

import { Button } from '@/components/Button/Button';
import { ErrorState } from '@/components/ErrorState/ErrorState';
import { LessonHeader } from '@/components/LessonHeader/LessonHeader';
import { Skeleton } from '@/components/Skeleton/Skeleton';
import { Stat } from '@/components/Stat/Stat';
import { AsyncStatus } from '@/enums/async-status.enum';
import { ReviewGrade } from '@/enums/review.enum';
import { TalkKind } from '@/enums/talk.enum';
import { answerCard } from '@/features/review/services/review.service';
import { TalkSituationCard } from '@/features/talk/components/TalkSituationCard';
import { TalkTransformCard } from '@/features/talk/components/TalkTransformCard';
import { loadTalkState } from '@/features/talk/services/talk.service';
import { TodaySessionLink } from '@/features/today/components/TodaySessionLink';
import { useAsync } from '@/hooks/useAsync';
import { useCopy } from '@/hooks/useCopy';
import { useFocusMode, useImmersive } from '@/hooks/useImmersive';
import type { TalkTurn } from '@/interfaces/talk.interface';

import './TalkScreen.css';

/**
 * Speaking style (plan v2 §5): what is due today, or every item of one unit (`?unit=u06`),
 * then one card at a time, then a short summary.
 */
export const TalkScreen = (): ReactElement => {
  const copy = useCopy();
  const unitId = useSearchParams().get('unit');
  const load = useCallback(() => loadTalkState(unitId), [unitId]);
  const state = useAsync(load);
  const [turns, setTurns] = useState<TalkTurn[] | null>(null);
  const [index, setIndex] = useState(0);
  const [good, setGood] = useState(0);
  const [saveError, setSaveError] = useState<string | null>(null);
  useFocusMode();
  useImmersive();

  if (state.status === AsyncStatus.Error) {
    return <ErrorState message={state.error ?? ''} onRetry={state.reload} />;
  }
  if (!state.data) return <Skeleton lines={6} />;
  const { overview, unitTurns } = state.data;
  const available = unitTurns ?? overview.turns;
  const closeHref = unitId ? `/talk?unit=${unitId}` : '/talk';

  const begin = (): void => {
    setTurns(available);
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
      <div className="talk-screen">
        <LessonHeader
          closeHref={closeHref}
          title={copy.talk.title}
          subtitle={turn ? copy.talk.progress(index + 1, turns.length) : undefined}
          progress={turns.length > 0 ? index / turns.length : 1}
        />
        <div className="talk-screen__body">
          {turn ? (
            <>
              {turn.isNew ? <span className="talk-screen__new">{copy.talk.newBadge}</span> : null}
              {turn.item.kind === TalkKind.Situation ? (
                <TalkSituationCard key={turn.card.id} item={turn.item} onAnswer={answer} />
              ) : (
                <TalkTransformCard key={turn.card.id} item={turn.item} onAnswer={answer} />
              )}
              {saveError !== null ? <p className="talk-screen__error">{saveError}</p> : null}
            </>
          ) : (
            <section className="talk-screen__summary" aria-labelledby="talk-summary">
              <h2 id="talk-summary" className="talk-screen__title">
                {copy.talk.summaryTitle}
              </h2>
              <p className="talk-screen__lead">{copy.talk.summaryLine(good, turns.length)}</p>
              <TodaySessionLink />
              <Button isFullWidth onClick={close}>
                {copy.talk.summaryMore}
              </Button>
              <Link href="/" className="button button--ghost">
                {copy.talk.backHome}
              </Link>
            </section>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="talk-screen">
      <LessonHeader closeHref={unitId ? '/curriculum' : '/'} title={copy.talk.title} />
      <div className="talk-screen__body">
        <p className="talk-screen__lead">{unitId ? copy.talk.unitLead(unitId) : copy.talk.lead}</p>
        {unitId ? null : (
          <>
            <div className="talk-screen__stats">
              <Stat label={copy.talk.due} value={String(overview.due)} />
              <Stat label={copy.talk.fresh} value={String(overview.fresh)} />
              <Stat
                label={copy.talk.started}
                value={String(overview.started)}
                tone={overview.started > 0 ? 'success' : 'neutral'}
              />
            </div>
            <p className="talk-screen__note">
              {copy.talk.startedHint(overview.started, overview.total)}
            </p>
            {overview.newPaused ? <p className="talk-screen__note">{copy.talk.paused}</p> : null}
          </>
        )}
        {available.length > 0 ? (
          <Button isFullWidth onClick={begin}>
            {copy.talk.start(available.length)}
          </Button>
        ) : (
          <p className="talk-screen__done" role="status">
            {copy.talk.allDone}
          </p>
        )}
        {available.length === 0 ? <TodaySessionLink /> : null}
        <Link href="/" className="button button--ghost">
          {copy.talk.backHome}
        </Link>
      </div>
    </div>
  );
};
