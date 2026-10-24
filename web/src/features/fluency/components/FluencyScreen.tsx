'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { type ReactElement, useCallback, useState, useSyncExternalStore } from 'react';

import { Button } from '@/components/Button/Button';
import { ErrorState } from '@/components/ErrorState/ErrorState';
import { LessonHeader } from '@/components/LessonHeader/LessonHeader';
import { Skeleton } from '@/components/Skeleton/Skeleton';
import { FLUENCY_ROUNDS_SECONDS } from '@/constants/fluency.constant';
import { AsyncStatus } from '@/enums/async-status.enum';
import { StorageKey } from '@/enums/storage-key.enum';
import { FluencyRound } from '@/features/fluency/components/FluencyRound';
import { FluencyTable } from '@/features/fluency/components/FluencyTable';
import { FluencyTrend } from '@/features/fluency/components/FluencyTrend';
import {
  loadFluencyDeck,
  placedUnitId,
  promptFor,
  recordSession,
  serverSessions,
  sessionsSnapshot,
  subscribeSessions,
  trendSessions,
} from '@/features/fluency/services/fluency.service';
import { useReferenceAudio } from '@/features/practice/hooks/useReferenceAudio';
import { TodaySessionLink } from '@/features/today/components/TodaySessionLink';
import { ContentFeedbackPanel } from '@/features/tutor/components/ContentFeedbackPanel';
import { useAsync } from '@/hooks/useAsync';
import { useCopy } from '@/hooks/useCopy';
import { useFocusMode, useImmersive } from '@/hooks/useImmersive';
import { useStoredState } from '@/hooks/useStoredState';
import type {
  FluencyMetrics,
  FluencyRound as FluencyRoundResult,
} from '@/interfaces/fluency.interface';
import { activeProfileId } from '@/utils/api-base.util';
import { fluencyChange } from '@/utils/fluency.util';

import './FluencyScreen.css';

const subscribeNever = (): (() => void) => () => undefined;

/**
 * "Nói 3 lần" (plan v2 §6, Nation's 4/3/2): one topic, three timed rounds that get shorter,
 * the three rounds' measures side by side, and the learner's own trend over sessions.
 */
export const FluencyScreen = (): ReactElement => {
  const copy = useCopy().fluency;
  const unitParam = useSearchParams().get('unit');
  const load = useCallback(() => loadFluencyDeck(), []);
  const deck = useAsync(load);
  const reference = useReferenceAudio();
  const [chosenUnit, setChosenUnit] = useState<string | null>(null);
  const [rounds, setRounds] = useState<FluencyRoundResult[]>([]);
  const [isHidden, setIsHidden] = useStoredState<boolean>(StorageKey.FluencyHidden, false);
  // Device storage is read after hydration (the static HTML has no learner).
  const placedUnit = useSyncExternalStore(subscribeNever, placedUnitId, () => null);
  const sessions = useSyncExternalStore(
    subscribeSessions,
    () => sessionsSnapshot(activeProfileId()),
    serverSessions,
  );
  const unitId = chosenUnit ?? unitParam ?? placedUnit;
  useFocusMode();
  useImmersive();

  if (deck.status === AsyncStatus.Error) {
    return <ErrorState message={deck.error ?? ''} onRetry={deck.reload} />;
  }
  const prompt = deck.data ? promptFor(deck.data.prompts, unitId) : null;
  if (!deck.data || !prompt) return <Skeleton lines={6} />;
  const seconds = deck.data.rounds.length > 0 ? deck.data.rounds : FLUENCY_ROUNDS_SECONDS;
  const isComplete = rounds.length >= seconds.length;
  const change = fluencyChange(rounds);

  const choose = (next: string): void => {
    reference.stop();
    setChosenUnit(next);
    setRounds([]);
  };
  const finishRound = (metrics: FluencyMetrics): void => {
    const done = [...rounds, { targetSeconds: seconds[rounds.length] ?? 0, metrics }];
    setRounds(done);
    if (done.length < seconds.length) return;
    recordSession({ profileId: activeProfileId(), promptId: prompt.id, rounds: done });
  };

  return (
    <div className="fluency-screen">
      <LessonHeader closeHref="/" title={copy.title} subtitle={prompt.title_vi} />
      <div className="fluency-screen__body">
        <p className="fluency-screen__lead">{copy.lead}</p>

        <section className="fluency-screen__prompt" aria-labelledby="fluency-topic">
          <p className="fluency-screen__eyebrow">{copy.topic}</p>
          <h2 id="fluency-topic" className="fluency-screen__topic">
            {prompt.title_vi}
            <span className="fluency-screen__topic-en">{prompt.title_en}</span>
          </h2>
          <label className="fluency-screen__select">
            <span>{copy.changeTopic}</span>
            <select
              className="fluency-screen__select-input"
              value={prompt.unit}
              onChange={(event) => choose(event.target.value)}
            >
              {deck.data.prompts.map((option) => (
                <option key={option.id} value={option.unit}>
                  {copy.topicOption(option.unit, option.title_vi)}
                </option>
              ))}
            </select>
          </label>
          <p className="fluency-screen__label">{copy.ideas}</p>
          <ul className="fluency-screen__ideas">
            {prompt.ideas_vi.map((idea) => (
              <li key={idea}>{idea}</li>
            ))}
          </ul>
          <p className="fluency-screen__label">{copy.phrases}</p>
          <ul className="fluency-screen__phrases">
            {prompt.phrases.map((phrase) => (
              <li key={phrase.en}>
                <button
                  type="button"
                  className="fluency-screen__phrase"
                  aria-label={copy.listen(phrase.en)}
                  onClick={() => reference.play(phrase.en)}
                >
                  <span lang="en">{phrase.en}</span>
                  <small className="fluency-screen__phrase-vi">{phrase.vi}</small>
                </button>
              </li>
            ))}
          </ul>
        </section>

        {isComplete ? (
          <section className="fluency-screen__summary" aria-labelledby="fluency-summary">
            <h2 id="fluency-summary" className="fluency-screen__topic">
              {copy.summaryTitle}
            </h2>
            {isHidden ? (
              <p className="fluency-screen__lead">{copy.hiddenDone}</p>
            ) : (
              <>
                <FluencyTable rounds={rounds} />
                {change ? (
                  <p className="fluency-screen__change">
                    {copy.compareLead} {copy.changeRate(change.speechRate)},{' '}
                    {copy.changeRun(change.meanLengthOfRun)},{' '}
                    {copy.changePauses(change.pausesPerMinute)}.
                  </p>
                ) : null}
                <p className="fluency-screen__note">{copy.explain}</p>
              </>
            )}
            <ContentFeedbackPanel taskVi={prompt.title_vi} />
            <TodaySessionLink />
            <Button isFullWidth onClick={() => setRounds([])}>
              {copy.again}
            </Button>
            <Link href="/" className="button button--ghost">
              {copy.backHome}
            </Link>
          </section>
        ) : (
          <>
            <FluencyRound
              key={`${prompt.id}:${String(rounds.length)}`}
              index={rounds.length + 1}
              total={seconds.length}
              seconds={seconds[rounds.length] ?? 0}
              nextSeconds={seconds[rounds.length + 1] ?? null}
              isHidden={isHidden}
              onDone={finishRound}
            />
            {rounds.length > 1 && !isHidden ? <FluencyTable rounds={rounds} /> : null}
          </>
        )}

        <label className="fluency-screen__toggle">
          <input
            type="checkbox"
            checked={isHidden}
            onChange={(event) => setIsHidden(event.target.checked)}
          />
          <span>{copy.hideNumbers}</span>
        </label>

        <FluencyTrend sessions={trendSessions(sessions)} prompts={deck.data.prompts} />
      </div>
    </div>
  );
};
