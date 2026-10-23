'use client';

import Link from 'next/link';
import { type ReactElement, useCallback } from 'react';

import { loadTalkDeck } from '@/features/talk/services/talk.service';
import { useAsync } from '@/hooks/useAsync';
import { useCopy } from '@/hooks/useCopy';
import { unitTalk } from '@/utils/talk.util';

import './UnitTalkLinks.css';

interface UnitTalkLinksProps {
  unitId: string;
}

/** A unit's functions and spoken pattern, with a link to practise them (plan v2 §5). */
export const UnitTalkLinks = ({ unitId }: UnitTalkLinksProps): ReactElement | null => {
  const copy = useCopy();
  const load = useCallback(() => loadTalkDeck(), []);
  const deck = useAsync(load).data;
  if (!deck) return null;
  const { functions, pattern } = unitTalk(deck, unitId);
  if (functions.length === 0 && !pattern) return null;
  return (
    <div className="unit-talk-links">
      <p className="unit-talk-links__title">{copy.talk.unitTitle}</p>
      <p className="unit-talk-links__line">
        {copy.talk.unitFunction}: {functions.map((fn) => fn.title_vi).join(', ')}
      </p>
      {pattern ? (
        <p className="unit-talk-links__line">
          {copy.talk.unitPattern}: {pattern.title_vi}
        </p>
      ) : null}
      <Link href={{ pathname: '/talk', query: { unit: unitId } }} className="unit-talk-links__link">
        {copy.talk.unitPractice}
      </Link>
    </div>
  );
};
