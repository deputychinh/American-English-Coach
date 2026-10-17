'use client';

import Link from 'next/link';
import { type ReactElement, useCallback } from 'react';

import { Button } from '@/components/Button/Button';
import { ConfidenceBadge } from '@/components/ConfidenceBadge/ConfidenceBadge';
import { ButtonVariant } from '@/enums/button-variant.enum';
import { getSound } from '@/features/content/services/content.service';
import { useReferenceAudio } from '@/features/practice/hooks/useReferenceAudio';
import { useAsync } from '@/hooks/useAsync';
import { useCopy } from '@/hooks/useCopy';
import type { PhonemeCard } from '@/interfaces/practice.interface';

import './SoundDetail.css';

interface SoundDetailProps {
  card: PhonemeCard;
}

export const SoundDetail = ({ card }: SoundDetailProps): ReactElement => {
  const copy = useCopy();
  const audio = useReferenceAudio();
  const loadDrill = useCallback(() => getSound(card.id), [card.id]);
  const drill = useAsync(loadDrill);
  return (
    <aside className="sound-detail" aria-labelledby="sound-detail-title">
      <div className="sound-detail__head">
        <h2 id="sound-detail-title" className="sound-detail__ipa">
          /{card.us}/
        </h2>
        <Link href="/sounds" scroll={false} className="sound-detail__close">
          {copy.sounds.close}
        </Link>
      </div>
      {card.symbol !== card.us ? (
        <p className="sound-detail__muted">{copy.sounds.chartSays(card.symbol, card.arpabet)}</p>
      ) : (
        <p className="sound-detail__muted">ARPAbet {card.arpabet}</p>
      )}
      <dl className="sound-detail__facts">
        <dt>{copy.sounds.example}</dt>
        <dd>{card.example}</dd>
        <dt>{copy.sounds.contrast}</dt>
        <dd>{card.contrast}</dd>
      </dl>
      <p>{card.tip}</p>
      {card.note ? <p className="sound-detail__muted">{card.note}</p> : null}
      <p>
        <ConfidenceBadge confidence={card.viseme_confidence} />
      </p>
      {drill.data?.transition_vi ? (
        <p className="sound-detail__muted">
          {copy.sounds.transition}: {drill.data.transition_vi}
        </p>
      ) : null}
      {drill.data ? (
        <p className="sound-detail__muted">
          {copy.sounds.drillSize(
            drill.data.words.length,
            drill.data.pairs.length,
            drill.data.sentences.length,
          )}
        </p>
      ) : null}
      <div className="sound-detail__actions">
        <Button onClick={() => audio.play(card.example)} disabled={audio.isPlaying}>
          {audio.isPlaying ? copy.practice.playing : copy.sounds.listen}
        </Button>
        <Link
          href={{ pathname: '/practice', query: { sound: card.id } }}
          className="button button--secondary"
        >
          {copy.sounds.practiceSound}
        </Link>
        <Link
          href={{ pathname: '/practice', query: { item: `word:${card.example}` } }}
          className="button button--ghost"
        >
          {copy.sounds.practiceWord}
        </Link>
        <Link
          href={{ pathname: '/mirror', query: { sound: card.arpabet } }}
          className="button button--ghost"
        >
          {copy.sounds.mirror}
        </Link>
      </div>
      {audio.error ? (
        <p className="sound-detail__error" role="alert">
          {audio.error}
        </p>
      ) : null}
      <Button variant={ButtonVariant.Ghost} isSmall onClick={() => audio.play(card.contrast)}>
        {copy.sounds.listen}: {card.contrast}
      </Button>
    </aside>
  );
};
