'use client';

import Link from 'next/link';
import type { ReactElement } from 'react';

import { Button } from '@/components/Button/Button';
import { COPY } from '@/constants/copy.constant';
import { ButtonVariant } from '@/enums/button-variant.enum';
import { useReferenceAudio } from '@/features/practice/hooks/useReferenceAudio';
import type { PhonemeCard } from '@/interfaces/practice.interface';

import './SoundDetail.css';

interface SoundDetailProps {
  card: PhonemeCard;
}

export const SoundDetail = ({ card }: SoundDetailProps): ReactElement => {
  const audio = useReferenceAudio();
  return (
    <aside className="sound-detail" aria-labelledby="sound-detail-title">
      <div className="sound-detail__head">
        <h2 id="sound-detail-title" className="sound-detail__ipa">
          /{card.us}/
        </h2>
        <Link href="/sounds" scroll={false} className="sound-detail__close">
          {COPY.sounds.close}
        </Link>
      </div>
      {card.symbol !== card.us ? (
        <p className="sound-detail__muted">
          Bảng 44 ghi /{card.symbol}/ · ARPAbet {card.arpabet}
        </p>
      ) : (
        <p className="sound-detail__muted">ARPAbet {card.arpabet}</p>
      )}
      <dl className="sound-detail__facts">
        <dt>{COPY.sounds.example}</dt>
        <dd>{card.example}</dd>
        <dt>{COPY.sounds.contrast}</dt>
        <dd>{card.contrast}</dd>
      </dl>
      <p>{card.tip}</p>
      {card.note ? <p className="sound-detail__muted">{card.note}</p> : null}
      <p className="sound-detail__badge">
        {card.viseme_group ? COPY.sounds.seen : COPY.sounds.audioOnly}
      </p>
      <div className="sound-detail__actions">
        <Button onClick={() => audio.play(card.example)} disabled={audio.isPlaying}>
          {audio.isPlaying ? COPY.practice.playing : COPY.sounds.listen}
        </Button>
        <Link
          href={{ pathname: '/practice', query: { item: `word:${card.example}` } }}
          className="button button--secondary"
        >
          {COPY.sounds.practiceWord}
        </Link>
        <Link
          href={{ pathname: '/mirror', query: { sound: card.arpabet } }}
          className="button button--ghost"
        >
          {COPY.sounds.mirror}
        </Link>
      </div>
      {audio.error ? (
        <p className="sound-detail__error" role="alert">
          {audio.error}
        </p>
      ) : null}
      <Button variant={ButtonVariant.Ghost} isSmall onClick={() => audio.play(card.contrast)}>
        {COPY.sounds.listen}: {card.contrast}
      </Button>
    </aside>
  );
};
