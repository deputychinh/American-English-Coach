'use client';

import Link from 'next/link';
import { type ReactElement, useCallback } from 'react';

import { Icon } from '@/components/Icon/Icon';
import { IconName } from '@/enums/icon-name.enum';
import { loadVocabState } from '@/features/vocab/services/vocab.service';
import { useAsync } from '@/hooks/useAsync';
import { useCopy } from '@/hooks/useCopy';

import './VocabHomeCard.css';

/** "Today" entry to vocabulary review with what is waiting. */
export const VocabHomeCard = (): ReactElement | null => {
  const copy = useCopy();
  const load = useCallback(() => loadVocabState(), []);
  const state = useAsync(load);
  const overview = state.data?.overview;
  if (!overview) return null;
  return (
    <Link href="/vocab" className="vocab-home-card">
      <span className="vocab-home-card__text">
        <span className="vocab-home-card__title">{copy.vocab.homeTitle}</span>
        <span className="vocab-home-card__line">
          {overview.turns.length > 0
            ? copy.vocab.homeLine(overview.due, overview.fresh)
            : copy.vocab.homeDone}
        </span>
      </span>
      <Icon name={IconName.ArrowRight} />
    </Link>
  );
};
