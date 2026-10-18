'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { type ReactElement, useState } from 'react';

import { ConfidenceBadge } from '@/components/ConfidenceBadge/ConfidenceBadge';
import { EmptyState } from '@/components/EmptyState/EmptyState';
import { ErrorState } from '@/components/ErrorState/ErrorState';
import { Icon } from '@/components/Icon/Icon';
import { PageIntro } from '@/components/PageIntro/PageIntro';
import { Sheet } from '@/components/Sheet/Sheet';
import { Skeleton } from '@/components/Skeleton/Skeleton';
import { Tabs } from '@/components/Tabs/Tabs';
import { AsyncStatus } from '@/enums/async-status.enum';
import { IconName } from '@/enums/icon-name.enum';
import { getPhonemes } from '@/features/content/services/content.service';
import { SoundDetail } from '@/features/sounds/components/SoundDetail';
import { useAsync } from '@/hooks/useAsync';
import { useCopy } from '@/hooks/useCopy';
import type { PhonemeCard } from '@/interfaces/practice.interface';
import { cx } from '@/utils/cx.util';

import './SoundChart.css';

type GroupFilter = 'all' | 'vowel' | 'diphthong' | 'consonant';

const matches = (card: PhonemeCard, query: string): boolean => {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return [card.us, card.symbol, card.example, card.contrast, card.arpabet].some((field) =>
    field.toLowerCase().includes(needle),
  );
};

const groupsOf = (cards: PhonemeCard[]): [string, PhonemeCard[]][] => {
  const map = new Map<string, PhonemeCard[]>();
  for (const card of cards) {
    const key = card.group.toLowerCase();
    map.set(key, [...(map.get(key) ?? []), card]);
  }
  return [...map.entries()];
};

export const SoundChart = (): ReactElement => {
  const copy = useCopy();
  const groupLabel: Record<string, string> = copy.sounds.groups;
  const { status, data, error, reload } = useAsync(getPhonemes);
  const router = useRouter();
  const selectedId = useSearchParams().get('id');
  const selected = data?.find((card) => card.id === selectedId) ?? null;
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<GroupFilter>('all');
  const visible = (data ?? []).filter(
    (card) => (filter === 'all' || card.group.toLowerCase() === filter) && matches(card, query),
  );

  return (
    <div className="sound-chart">
      <PageIntro title={copy.sounds.title} lead={copy.sounds.lead} />
      <div className="sound-chart__toolbar">
        <label className="sound-chart__search">
          <Icon name={IconName.Search} className="sound-chart__search-icon" />
          <span className="visually-hidden">{copy.sounds.search}</span>
          <input
            type="search"
            className="sound-chart__search-input"
            placeholder={copy.sounds.search}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <Tabs
          label={copy.sounds.groups.vowel}
          value={filter}
          options={[
            { id: 'all', label: copy.sounds.all },
            { id: 'vowel', label: copy.sounds.groups.vowel },
            { id: 'diphthong', label: copy.sounds.groups.diphthong },
            { id: 'consonant', label: copy.sounds.groups.consonant },
          ]}
          onChange={setFilter}
        />
      </div>
      {status === AsyncStatus.Loading ? <Skeleton lines={6} /> : null}
      {status === AsyncStatus.Error ? <ErrorState message={error ?? ''} onRetry={reload} /> : null}
      {data ? (
        <div className="sound-chart__layout">
          <div className="sound-chart__groups">
            {visible.length === 0 ? <EmptyState message={copy.sounds.emptySearch} /> : null}
            {groupsOf(visible).map(([group, cards]) => (
              <section
                key={group}
                className="sound-chart__group"
                aria-labelledby={`group-${group}`}
              >
                <h2 id={`group-${group}`} className="sound-chart__group-title">
                  {groupLabel[group] ?? group}
                  <span className="sound-chart__group-count">
                    {copy.sounds.count(cards.length)}
                  </span>
                </h2>
                <ul className="sound-chart__list">
                  {cards.map((card) => (
                    <li key={card.id}>
                      <Link
                        href={{ pathname: '/sounds', query: { id: card.id } }}
                        scroll={false}
                        className={cx('sound-chart__card', card.id === selectedId && 'is-selected')}
                        aria-current={card.id === selectedId ? 'true' : undefined}
                      >
                        <span className="sound-chart__ipa">/{card.us}/</span>
                        <span className="sound-chart__example">{card.example}</span>
                        <ConfidenceBadge confidence={card.viseme_confidence} isCompact />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
          <Sheet
            isOpen={selected !== null}
            title={copy.mirror.details}
            onClose={() => router.replace('/sounds', { scroll: false })}
          >
            {selected ? <SoundDetail card={selected} /> : null}
          </Sheet>
        </div>
      ) : null}
    </div>
  );
};
