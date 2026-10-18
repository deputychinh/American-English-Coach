'use client';

import { type ReactElement, useState } from 'react';

import { ConfidenceBadge } from '@/components/ConfidenceBadge/ConfidenceBadge';
import { Icon } from '@/components/Icon/Icon';
import { Sheet } from '@/components/Sheet/Sheet';
import { IconName } from '@/enums/icon-name.enum';
import { useCopy } from '@/hooks/useCopy';
import type { PhonemeCard } from '@/interfaces/practice.interface';
import { cx } from '@/utils/cx.util';

import './SoundPickerSheet.css';

interface SoundPickerSheetProps {
  isOpen: boolean;
  onClose: () => void;
  phonemes: PhonemeCard[];
  selected: string;
  onPick: (arpabet: string) => void;
  confidenceOf: (arpabet: string) => string | null;
  labels?: Record<string, string>;
}

const matches = (card: PhonemeCard, query: string): boolean =>
  `${card.us} ${card.example} ${card.symbol} ${card.arpabet}`.toLowerCase().includes(query);

/** All 44 sounds in a bottom sheet: vowels, then consonants, filterable, with the camera badge. */
export const SoundPickerSheet = ({
  isOpen,
  onClose,
  phonemes,
  selected,
  onPick,
  confidenceOf,
  labels,
}: SoundPickerSheetProps): ReactElement => {
  const copy = useCopy();
  const [query, setQuery] = useState('');
  const needle = query.trim().toLowerCase();
  const shown = needle ? phonemes.filter((card) => matches(card, needle)) : phonemes;
  const sections = [
    { title: copy.mirror.vowels, items: shown.filter((card) => card.id.startsWith('v')) },
    { title: copy.mirror.consonants, items: shown.filter((card) => !card.id.startsWith('v')) },
  ].filter((section) => section.items.length > 0);

  return (
    <Sheet isOpen={isOpen} title={copy.mirror.pickerTitle} onClose={onClose}>
      <label className="sound-picker-sheet__search">
        <Icon name={IconName.Search} />
        <span className="visually-hidden">{copy.mirror.pickerSearch}</span>
        <input
          type="search"
          className="sound-picker-sheet__input"
          placeholder={copy.mirror.pickerSearch}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      {sections.map((section) => (
        <section key={section.title} className="sound-picker-sheet__section">
          <h3 className="sound-picker-sheet__heading">{section.title}</h3>
          <ul className="sound-picker-sheet__list">
            {section.items.map((card) => (
              <li key={card.id}>
                <button
                  type="button"
                  className={cx(
                    'sound-picker-sheet__item',
                    card.arpabet === selected && 'is-selected',
                  )}
                  aria-pressed={card.arpabet === selected}
                  onClick={() => {
                    onPick(card.arpabet);
                    onClose();
                  }}
                >
                  <span className="sound-picker-sheet__ipa">/{card.us}/</span>
                  <span className="sound-picker-sheet__word">{card.example}</span>
                  <ConfidenceBadge
                    confidence={confidenceOf(card.arpabet)}
                    labels={labels}
                    isCompact
                  />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </Sheet>
  );
};
