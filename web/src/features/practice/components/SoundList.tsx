'use client';

import Link from 'next/link';
import { type ReactElement, useState } from 'react';

import { ConfidenceBadge } from '@/components/ConfidenceBadge/ConfidenceBadge';
import { Tabs } from '@/components/Tabs/Tabs';
import { useCopy } from '@/hooks/useCopy';
import type { SoundDrillSummary } from '@/interfaces/practice.interface';

import './SoundList.css';

interface SoundListProps {
  sounds: SoundDrillSummary[];
  labels?: Record<string, string>;
}

type SoundGroup = 'vowels' | 'consonants';

const inGroup = (sound: SoundDrillSummary, group: SoundGroup): boolean =>
  (sound.group.toLowerCase() === 'consonant') === (group === 'consonants');

/** The 44 chart sounds as a dense grid, vowels or consonants; each tile opens a drill. */
export const SoundList = ({ sounds, labels }: SoundListProps): ReactElement => {
  const copy = useCopy();
  const [group, setGroup] = useState<SoundGroup>('vowels');
  return (
    <div className="sound-list">
      <Tabs
        label={copy.practice.bySound}
        value={group}
        options={[
          { id: 'vowels', label: copy.sounds.vowels },
          { id: 'consonants', label: copy.sounds.groups.consonant },
        ]}
        onChange={setGroup}
      />
      <ul className="sound-list__grid">
        {sounds.map((sound) => (
          <li key={sound.id} className={inGroup(sound, group) ? undefined : 'sound-list__hidden'}>
            <Link
              href={{ pathname: '/practice', query: { sound: sound.id } }}
              className="sound-list__card"
            >
              <span className="sound-list__ipa">/{sound.us}/</span>
              {sound.example ? <span className="sound-list__example">{sound.example}</span> : null}
              <ConfidenceBadge confidence={sound.viseme_confidence} labels={labels} isCompact />
              <span className="visually-hidden">
                {copy.sounds.drillSize(sound.word_count, sound.pair_count, sound.sentence_count)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};
