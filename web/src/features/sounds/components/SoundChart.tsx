'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { ReactElement } from 'react';

import { ErrorState } from '@/components/ErrorState/ErrorState';
import { PageIntro } from '@/components/PageIntro/PageIntro';
import { Skeleton } from '@/components/Skeleton/Skeleton';
import { COPY } from '@/constants/copy.constant';
import { AsyncStatus } from '@/enums/async-status.enum';
import { getPhonemes } from '@/features/content/services/content.service';
import { SoundDetail } from '@/features/sounds/components/SoundDetail';
import { useAsync } from '@/hooks/useAsync';
import type { PhonemeCard } from '@/interfaces/practice.interface';
import { cx } from '@/utils/cx.util';

import './SoundChart.css';

const GROUP_LABEL: Record<string, string> = {
  vowel: COPY.sounds.vowels,
  diphthong: 'Nguyên âm đôi',
  consonant: COPY.sounds.consonants,
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
  const { status, data, error, reload } = useAsync(getPhonemes);
  const selectedId = useSearchParams().get('id');
  const selected = data?.find((card) => card.id === selectedId) ?? null;

  return (
    <div className="sound-chart">
      <PageIntro
        title={COPY.sounds.title}
        lead="Bảng 44 âm truyền thống với đối chiếu Mỹ, từ mẫu, cặp dễ nhầm và hướng dẫn khẩu hình tiếng Việt."
      />
      {status === AsyncStatus.Loading ? <Skeleton lines={6} /> : null}
      {status === AsyncStatus.Error ? <ErrorState message={error ?? ''} onRetry={reload} /> : null}
      {data ? (
        <div className={cx('sound-chart__layout', selected && 'has-detail')}>
          <div className="sound-chart__groups">
            {groupsOf(data).map(([group, cards]) => (
              <section
                key={group}
                className="sound-chart__group"
                aria-labelledby={`group-${group}`}
              >
                <h2 id={`group-${group}`} className="sound-chart__group-title">
                  {GROUP_LABEL[group] ?? group}
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
                        <span className="sound-chart__badge">
                          {card.viseme_group ? COPY.sounds.seen : COPY.sounds.audioOnly}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
          {selected ? <SoundDetail card={selected} /> : null}
        </div>
      ) : null}
    </div>
  );
};
