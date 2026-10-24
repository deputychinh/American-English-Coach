'use client';

import { type ReactElement, useCallback } from 'react';

import { ListRow } from '@/components/ListRow/ListRow';
import { IconName } from '@/enums/icon-name.enum';
import { loadVocabState } from '@/features/vocab/services/vocab.service';
import { useAsync } from '@/hooks/useAsync';
import { useCopy } from '@/hooks/useCopy';

/** "Today" entry to vocabulary review with what is waiting. */
export const VocabHomeCard = (): ReactElement | null => {
  const copy = useCopy();
  const load = useCallback(() => loadVocabState(), []);
  const state = useAsync(load);
  const overview = state.data?.overview;
  if (!overview) return null;
  return (
    <ListRow
      href="/vocab"
      icon={IconName.Refresh}
      title={copy.vocab.homeTitle}
      subtitle={
        overview.turns.length > 0
          ? copy.vocab.homeLine(overview.due, overview.fresh)
          : copy.vocab.homeDone
      }
    />
  );
};
