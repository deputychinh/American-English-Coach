'use client';

import { type ReactElement, useEffect } from 'react';

import { Icon } from '@/components/Icon/Icon';
import { IconName } from '@/enums/icon-name.enum';
import { useReferenceAudio } from '@/features/practice/hooks/useReferenceAudio';
import { useCopy } from '@/hooks/useCopy';
import type { LessonPartnerLine } from '@/interfaces/lesson.interface';
import { cx } from '@/utils/cx.util';

import './LessonBanner.css';

interface LessonBannerProps {
  label: string;
  passed: string;
  scenario?: string;
  /** Role-play: the line the app's voice says before the learner answers. */
  partner?: LessonPartnerLine | null;
  /** Role-play: what the learner's line means. */
  meaning?: string;
}

/** Under the practice bar: the lesson step, the "passed" count and, in a role-play, the partner. */
export const LessonBanner = ({
  label,
  passed,
  scenario,
  partner = null,
  meaning,
}: LessonBannerProps): ReactElement => {
  const copy = useCopy();
  const audio = useReferenceAudio();
  const { play } = audio;
  const line = partner?.text ?? null;

  // The learner just tapped "next", so the partner can speak first, as in a conversation.
  useEffect(() => {
    if (line) play(line);
  }, [line, play]);

  return (
    <header className="lesson-banner">
      <p className="lesson-banner__step">{label}</p>
      <p className="lesson-banner__passed" aria-live="polite">
        {passed}
      </p>
      {scenario && !partner ? (
        <p className="lesson-banner__scenario">
          <strong>{copy.lesson.scenario}:</strong> {scenario}
        </p>
      ) : null}
      {partner ? (
        <div className="lesson-banner__dialogue">
          <button
            type="button"
            className={cx('lesson-banner__partner', audio.isPlaying && 'is-playing')}
            onClick={() => play(partner.text)}
            aria-label={copy.lesson.playPartner(partner.text)}
          >
            <Icon name={audio.isPlaying ? IconName.Volume : IconName.Play} />
            <span className="lesson-banner__bubble">
              <span className="lesson-banner__line">{partner.text}</span>
              <span className="lesson-banner__meaning">{partner.vi}</span>
            </span>
          </button>
          {meaning ? (
            <p className="lesson-banner__answer">
              <strong>{copy.lesson.yourTurn}:</strong> {meaning}
            </p>
          ) : null}
        </div>
      ) : null}
      {audio.error && partner ? (
        <p className="lesson-banner__error" role="alert">
          {audio.error}
        </p>
      ) : null}
    </header>
  );
};
