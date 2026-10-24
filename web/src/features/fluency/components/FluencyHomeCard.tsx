'use client';

import { type ReactElement, useCallback, useSyncExternalStore } from 'react';

import { ListRow } from '@/components/ListRow/ListRow';
import { IconName } from '@/enums/icon-name.enum';
import {
  loadFluencyDeck,
  placedUnitId,
  promptFor,
} from '@/features/fluency/services/fluency.service';
import { useAsync } from '@/hooks/useAsync';
import { useCopy } from '@/hooks/useCopy';

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
    <ListRow
      href={{ pathname: '/fluency', query: { unit: prompt.unit } }}
      icon={IconName.Replay}
      title={copy.homeTitle}
      subtitle={copy.homeLine(prompt.title_vi)}
    />
  );
};
