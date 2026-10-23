'use client';

import type { ReactElement } from 'react';

import { Icon } from '@/components/Icon/Icon';
import { IconName } from '@/enums/icon-name.enum';
import { TakePhase } from '@/enums/take-phase.enum';
import { useCopy } from '@/hooks/useCopy';
import type { ScoredTake } from '@/interfaces/hooks.interface';
import { cx } from '@/utils/cx.util';

import './TalkCard.css';

interface TalkMicProps {
  take: ScoredTake;
  onToggle: () => void;
}

/** The record button of a talk card: tap to speak, tap again (or pause) to have it scored. */
export const TalkMic = ({ take, onToggle }: TalkMicProps): ReactElement => {
  const copy = useCopy();
  const isScoring = take.phase === TakePhase.Scoring;
  return (
    <button
      type="button"
      className={cx('talk-card__mic', take.isRecording && 'is-recording')}
      disabled={isScoring}
      onClick={onToggle}
    >
      <Icon name={take.isRecording ? IconName.Stop : IconName.Practice} />
      <span>
        {isScoring ? copy.talk.scoring : take.isRecording ? copy.talk.stop : copy.talk.record}
      </span>
    </button>
  );
};
