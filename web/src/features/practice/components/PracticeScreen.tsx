'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { type ReactElement, useCallback, useState } from 'react';

import { Button } from '@/components/Button/Button';
import { ErrorState } from '@/components/ErrorState/ErrorState';
import { PageIntro } from '@/components/PageIntro/PageIntro';
import { Skeleton } from '@/components/Skeleton/Skeleton';
import { AsyncStatus } from '@/enums/async-status.enum';
import { ButtonVariant } from '@/enums/button-variant.enum';
import { getPracticeContent } from '@/features/content/services/content.service';
import { DrillSession } from '@/features/practice/components/DrillSession';
import { PracticeList } from '@/features/practice/components/PracticeList';
import { PracticeSession } from '@/features/practice/components/PracticeSession';
import { ResultCard } from '@/features/practice/components/ResultCard';
import { SoundList } from '@/features/practice/components/SoundList';
import { getRun } from '@/features/progress/services/progress.service';
import { useAsync } from '@/hooks/useAsync';
import { useCopy } from '@/hooks/useCopy';
import { resolvePracticeItem } from '@/utils/practice-item.util';

import './PracticeScreen.css';

const StoredRun = ({ runId }: { runId: string }): ReactElement => {
  const copy = useCopy();
  const load = useCallback(() => getRun(runId), [runId]);
  const run = useAsync(load);
  if (run.status === AsyncStatus.Error)
    return <ErrorState message={run.error ?? ''} onRetry={run.reload} />;
  if (!run.data) return <Skeleton lines={4} label={copy.practice.loadingRun} />;
  return <ResultCard result={run.data} recording={null} outlineAt={() => []} />;
};

export const PracticeScreen = (): ReactElement => {
  const copy = useCopy();
  const params = useSearchParams();
  const itemParam = params.get('item');
  const runId = params.get('run');
  const soundId = params.get('sound');
  const [tab, setTab] = useState<'sounds' | 'items'>(itemParam ? 'items' : 'sounds');
  const content = useAsync(getPracticeContent);

  if (runId) {
    return (
      <div className="stack">
        <PageIntro title={copy.practice.resultTitle}>
          <Link href="/practice" className="button button--ghost">
            {copy.practice.back}
          </Link>
        </PageIntro>
        <StoredRun runId={runId} />
      </div>
    );
  }
  if (soundId) return <DrillSession soundId={soundId} />;
  if (content.status === AsyncStatus.Error) {
    return <ErrorState message={content.error ?? ''} onRetry={content.reload} />;
  }
  if (!content.data) return <Skeleton lines={6} />;

  const item = resolvePracticeItem(itemParam, content.data);
  if (item) return <PracticeSession item={item} />;
  return (
    <div className="stack">
      <PageIntro
        title={copy.practice.title}
        lead={tab === 'sounds' ? copy.practice.bySoundLead : copy.practice.byItemsLead}
      />
      <div className="practice-screen__tabs" role="tablist" aria-label={copy.practice.title}>
        <Button
          role="tab"
          aria-selected={tab === 'sounds'}
          variant={tab === 'sounds' ? ButtonVariant.Primary : ButtonVariant.Ghost}
          onClick={() => setTab('sounds')}
        >
          {copy.practice.bySound}
        </Button>
        <Button
          role="tab"
          aria-selected={tab === 'items'}
          variant={tab === 'items' ? ButtonVariant.Primary : ButtonVariant.Ghost}
          onClick={() => setTab('items')}
        >
          {copy.practice.byItems}
        </Button>
      </div>
      {itemParam ? <ErrorState message={copy.practice.notFound(itemParam)} /> : null}
      {tab === 'sounds' ? (
        <SoundList sounds={content.data.sounds} />
      ) : (
        <PracticeList pairs={content.data.pairs} sentences={content.data.sentences} />
      )}
    </div>
  );
};
