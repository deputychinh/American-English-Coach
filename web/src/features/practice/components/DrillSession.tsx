'use client';

import Link from 'next/link';
import { type ReactElement, useCallback, useMemo, useState } from 'react';

import type { Verdict } from '@/api/coach.schema';
import { Button } from '@/components/Button/Button';
import { ConfidenceBadge } from '@/components/ConfidenceBadge/ConfidenceBadge';
import { ErrorState } from '@/components/ErrorState/ErrorState';
import { PageIntro } from '@/components/PageIntro/PageIntro';
import { Skeleton } from '@/components/Skeleton/Skeleton';
import { AsyncStatus } from '@/enums/async-status.enum';
import { ButtonVariant } from '@/enums/button-variant.enum';
import { getSound, getVisemes } from '@/features/content/services/content.service';
import { PracticeSession } from '@/features/practice/components/PracticeSession';
import { useAsync } from '@/hooks/useAsync';
import { useCopy } from '@/hooks/useCopy';
import { useKeepAwake } from '@/hooks/useKeepAwake';
import type {
  AssessmentResponse,
  DrillItem,
  DrillTally,
  SoundDrill,
  VisemeContent,
} from '@/interfaces/practice.interface';
import {
  addToTally,
  buildDrillItems,
  emptyTally,
  targetPhoneOf,
  targetVerdict,
} from '@/utils/drill.util';

import './DrillSession.css';

interface DrillSessionProps {
  soundId: string;
}

interface DrillSummaryProps {
  drill: SoundDrill;
  tally: DrillTally;
  onRetryFailed: () => void;
  onRestart: () => void;
}

const DrillSummary = ({
  drill,
  tally,
  onRetryFailed,
  onRestart,
}: DrillSummaryProps): ReactElement => {
  const copy = useCopy();
  return (
    <section className="drill-session__summary" aria-labelledby="drill-summary-title">
      <h2 id="drill-summary-title">{copy.practice.drill.summaryTitle}</h2>
      <p>{copy.practice.drill.tally(tally)}</p>
      {tally.failedIds.length === 0 ? <p>{copy.practice.drill.allDone}</p> : null}
      <div className="drill-session__actions">
        {tally.failedIds.length > 0 ? (
          <Button onClick={onRetryFailed}>{copy.practice.drill.retryFailed}</Button>
        ) : null}
        <Link
          href={{ pathname: '/mirror', query: { sound: targetPhoneOf(drill.arpabet) } }}
          className="button button--secondary"
        >
          {copy.practice.drill.mirror}
        </Link>
        <Button variant={ButtonVariant.Ghost} onClick={onRestart}>
          {copy.practice.drill.restart}
        </Button>
        <Link href="/practice" className="button button--ghost">
          {copy.practice.drill.backToSounds}
        </Link>
      </div>
    </section>
  );
};

const loadDrill =
  (soundId: string) => async (): Promise<{ drill: SoundDrill; visemes: VisemeContent }> => {
    const [drill, visemes] = await Promise.all([getSound(soundId), getVisemes()]);
    return { drill, visemes };
  };

/** Runs every item of a sound's drill through the practice flow and tallies the target phone. */
export const DrillSession = ({ soundId }: DrillSessionProps): ReactElement => {
  const copy = useCopy();
  const load = useMemo(() => loadDrill(soundId), [soundId]);
  const content = useAsync(load);
  const [queue, setQueue] = useState<DrillItem[] | null>(null);
  const [index, setIndex] = useState(0);
  const [tally, setTally] = useState<DrillTally>(emptyTally);
  const [isScored, setIsScored] = useState(false);
  useKeepAwake();

  const items = useMemo(
    () => (content.data ? buildDrillItems(content.data.drill) : []),
    [content.data],
  );
  const active = queue ?? items;
  const current = active[index] ?? null;
  const symbol = content.data ? targetPhoneOf(content.data.drill.arpabet) : '';
  const group = content.data?.visemes.groups.find((g) => g.sounds.includes(symbol)) ?? null;

  const advance = useCallback(
    (verdict: Verdict | null) => {
      if (!current) return;
      setTally((previous) => addToTally(previous, current.item, verdict));
      setIsScored(false);
      setIndex((value) => value + 1);
    },
    [current],
  );
  const onResult = useCallback(
    (result: AssessmentResponse) => {
      if (!current) return;
      setIsScored(true);
      setTally((previous) => addToTally(previous, current.item, targetVerdict(result, symbol)));
    },
    [current, symbol],
  );
  const next = (): void => {
    if (isScored) {
      setIsScored(false);
      setIndex((value) => value + 1);
    } else {
      advance(null);
    }
  };
  const restartWith = (selection: DrillItem[]): void => {
    setQueue(selection);
    setIndex(0);
    setTally(emptyTally());
    setIsScored(false);
  };

  if (content.status === AsyncStatus.Error)
    return <ErrorState message={content.error ?? ''} onRetry={content.reload} />;
  if (!content.data) return <Skeleton lines={6} label={copy.practice.drill.loading} />;
  const { drill, visemes } = content.data;

  if (!current) {
    return (
      <div className="drill-session">
        <PageIntro title={`/${drill.us}/`} lead={copy.practice.bySound} />
        <DrillSummary
          drill={drill}
          tally={tally}
          onRetryFailed={() =>
            restartWith(items.filter((e) => tally.failedIds.includes(e.item.id)))
          }
          onRestart={() => restartWith(items)}
        />
      </div>
    );
  }

  return (
    <div className="drill-session">
      <PracticeSession
        key={current.item.id}
        item={current.item}
        targetGroup={group}
        targetIpa={drill.us}
        transitionVi={drill.transition_vi}
        onResult={onResult}
        banner={
          <header className="drill-session__head">
            <p className="drill-session__progress">
              {copy.practice.drill.progress(index + 1, active.length)} ·{' '}
              {copy.practice.drill.stage[current.stage]} · {copy.practice.drill.targetPhone} /
              {drill.us}/
            </p>
            <ConfidenceBadge
              confidence={drill.viseme_confidence}
              labels={visemes.confidence_labels}
            />
            <p className="drill-session__tally" aria-live="polite">
              {copy.practice.drill.tally(tally)}
            </p>
          </header>
        }
        extraActions={
          <>
            <Button onClick={next}>{copy.practice.drill.next}</Button>
            {!isScored ? (
              <Button variant={ButtonVariant.Ghost} onClick={() => advance(null)}>
                {copy.practice.drill.skip}
              </Button>
            ) : null}
          </>
        }
      />
    </div>
  );
};
