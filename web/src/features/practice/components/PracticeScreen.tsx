'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { type ReactElement, useCallback } from 'react';

import { ErrorState } from '@/components/ErrorState/ErrorState';
import { PageIntro } from '@/components/PageIntro/PageIntro';
import { Skeleton } from '@/components/Skeleton/Skeleton';
import { COPY } from '@/constants/copy.constant';
import { AsyncStatus } from '@/enums/async-status.enum';
import { getPracticeContent } from '@/features/content/services/content.service';
import { PracticeList } from '@/features/practice/components/PracticeList';
import { PracticeSession } from '@/features/practice/components/PracticeSession';
import { ResultCard } from '@/features/practice/components/ResultCard';
import { getRun } from '@/features/progress/services/progress.service';
import { useAsync } from '@/hooks/useAsync';
import { resolvePracticeItem } from '@/utils/practice-item.util';

const StoredRun = ({ runId }: { runId: string }): ReactElement => {
  const load = useCallback(() => getRun(runId), [runId]);
  const run = useAsync(load);
  if (run.status === AsyncStatus.Error)
    return <ErrorState message={run.error ?? ''} onRetry={run.reload} />;
  if (!run.data) return <Skeleton lines={4} label={COPY.practice.loadingRun} />;
  return <ResultCard result={run.data} recording={null} outlineAt={() => []} />;
};

export const PracticeScreen = (): ReactElement => {
  const params = useSearchParams();
  const itemParam = params.get('item');
  const runId = params.get('run');
  const content = useAsync(getPracticeContent);

  if (runId) {
    return (
      <div className="stack">
        <PageIntro title={COPY.practice.resultTitle}>
          <Link href="/practice" className="button button--ghost">
            {COPY.practice.back}
          </Link>
        </PageIntro>
        <StoredRun runId={runId} />
      </div>
    );
  }
  if (content.status === AsyncStatus.Error) {
    return <ErrorState message={content.error ?? ''} onRetry={content.reload} />;
  }
  if (!content.data) return <Skeleton lines={6} />;

  const item = resolvePracticeItem(itemParam, content.data);
  if (item) return <PracticeSession item={item} />;
  return (
    <div className="stack">
      <PageIntro
        title={COPY.practice.title}
        lead="Chọn một cặp âm hoặc một câu. Thu âm, máy chấm từng âm; bật camera để nhận xét thêm về khẩu hình."
      />
      {itemParam ? <ErrorState message={`Không tìm thấy bài "${itemParam}".`} /> : null}
      <PracticeList pairs={content.data.pairs} sentences={content.data.sentences} />
    </div>
  );
};
