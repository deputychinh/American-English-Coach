'use client';

import Link from 'next/link';
import { type ReactElement, useCallback } from 'react';

import { Icon } from '@/components/Icon/Icon';
import { IconName } from '@/enums/icon-name.enum';
import { loadTalkState } from '@/features/talk/services/talk.service';
import { useAsync } from '@/hooks/useAsync';
import { useCopy } from '@/hooks/useCopy';

import './TalkHomeCard.css';

/** "Today" entry to speaking style practice with what is waiting. */
export const TalkHomeCard = (): ReactElement | null => {
  const copy = useCopy();
  const load = useCallback(() => loadTalkState(null), []);
  const overview = useAsync(load).data?.overview;
  if (!overview) return null;
  return (
    <Link href="/talk" className="talk-home-card">
      <span className="talk-home-card__text">
        <span className="talk-home-card__title">{copy.talk.homeTitle}</span>
        <span className="talk-home-card__line">
          {overview.turns.length > 0
            ? copy.talk.homeLine(overview.due, overview.fresh)
            : copy.talk.homeDone}
        </span>
      </span>
      <Icon name={IconName.ArrowRight} />
    </Link>
  );
};
