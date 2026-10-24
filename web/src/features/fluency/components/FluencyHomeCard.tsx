'use client';

import Link from 'next/link';
import { type ReactElement, useCallback, useSyncExternalStore } from 'react';

import { Icon } from '@/components/Icon/Icon';
import { IconName } from '@/enums/icon-name.enum';
import {
  loadFluencyDeck,
  placedUnitId,
  promptFor,
} from '@/features/fluency/services/fluency.service';
import { useAsync } from '@/hooks/useAsync';
import { useCopy } from '@/hooks/useCopy';

import './FluencyHomeCard.css';

const subscribeNever = (): (() => void) => () => undefined;

/** "Today" entry to "Nói 3 lần" on the topic of the learner's unit. */
export const FluencyHomeCard = (): ReactElement | null => {
  const copy = useCopy().fluency;
  const load = useCallback(() => loadFluencyDeck(), []);
  const deck = useAsync(load).data;
  const unitId = useSyncExternalStore(subscribeNever, placedUnitId, () => null);
  const prompt = deck ? promptFor(deck.prompts, unitId) : null;
  if (!prompt) return null;
  return (
    <Link
      href={{ pathname: '/fluency', query: { unit: prompt.unit } }}
      className="fluency-home-card"
    >
      <span className="fluency-home-card__text">
        <span className="fluency-home-card__title">{copy.homeTitle}</span>
        <span className="fluency-home-card__line">{copy.homeLine(prompt.title_vi)}</span>
      </span>
      <Icon name={IconName.ArrowRight} />
    </Link>
  );
};
