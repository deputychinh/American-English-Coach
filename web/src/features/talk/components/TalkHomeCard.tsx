'use client';

import { type ReactElement, useCallback } from 'react';

import { ListRow } from '@/components/ListRow/ListRow';
import { IconName } from '@/enums/icon-name.enum';
import { loadTalkState } from '@/features/talk/services/talk.service';
import { useAsync } from '@/hooks/useAsync';
import { useCopy } from '@/hooks/useCopy';

/** "Today" entry to speaking style practice with what is waiting. */
export const TalkHomeCard = (): ReactElement | null => {
  const copy = useCopy();
  const load = useCallback(() => loadTalkState(null), []);
  const overview = useAsync(load).data?.overview;
  if (!overview) return null;
  return (
    <ListRow
      href="/talk"
      icon={IconName.Practice}
      title={copy.talk.homeTitle}
      subtitle={
        overview.turns.length > 0
          ? copy.talk.homeLine(overview.due, overview.fresh)
          : copy.talk.homeDone
      }
    />
  );
};
