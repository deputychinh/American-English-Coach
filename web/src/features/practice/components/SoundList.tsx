import Link from 'next/link';
import type { ReactElement } from 'react';

import { ConfidenceBadge } from '@/components/ConfidenceBadge/ConfidenceBadge';
import { useCopy } from '@/hooks/useCopy';
import type { SoundDrillSummary } from '@/interfaces/practice.interface';

import './SoundList.css';

interface SoundListProps {
  sounds: SoundDrillSummary[];
  labels?: Record<string, string>;
}

const GROUP_ORDER = ['vowel', 'diphthong', 'consonant'];

const grouped = (sounds: SoundDrillSummary[]): [string, SoundDrillSummary[]][] =>
  GROUP_ORDER.map((group): [string, SoundDrillSummary[]] => [
    group,
    sounds.filter((sound) => sound.group.toLowerCase() === group),
  ]).filter(([, items]) => items.length > 0);

/** All 44 chart sounds, each opening a drill; the badge says how much the camera can see. */
export const SoundList = ({ sounds, labels }: SoundListProps): ReactElement => {
  const copy = useCopy();
  const groupLabel = copy.sounds.groups as Record<string, string>;
  return (
    <div className="sound-list">
      {grouped(sounds).map(([group, items]) => (
        <section key={group} aria-labelledby={`sound-list-${group}`}>
          <h2 id={`sound-list-${group}`} className="sound-list__heading">
            {groupLabel[group] ?? group}
          </h2>
          <ul className="sound-list__grid">
            {items.map((sound) => (
              <li key={sound.id}>
                <Link
                  href={{ pathname: '/practice', query: { sound: sound.id } }}
                  className="sound-list__card"
                >
                  <span className="sound-list__ipa">/{sound.us}/</span>
                  <span className="sound-list__meta">
                    {copy.sounds.drillSize(
                      sound.word_count,
                      sound.pair_count,
                      sound.sentence_count,
                    )}
                  </span>
                  <ConfidenceBadge confidence={sound.viseme_confidence} labels={labels} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
};
