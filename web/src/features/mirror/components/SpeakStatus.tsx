'use client';

import Link from 'next/link';
import type { ReactElement, ReactNode } from 'react';

import { useCopy } from '@/hooks/useCopy';
import type { SpeakOutcome, SpeakPhase } from '@/interfaces/mouth-match.interface';
import { cx } from '@/utils/cx.util';

interface SpeakStatusProps {
  phase: SpeakPhase;
  outcome: SpeakOutcome | null;
  error: string | null;
  ipa: string;
  drillId: string;
  isMastered: boolean;
  canJudgeMouth: boolean;
  hasSpeech: boolean;
  /** Live mouth feedback shown while idle. */
  live: ReactNode;
  /** The scorer often confuses this sound: an unsure verdict says so and suggests comparing. */
  isScorerUnsure?: boolean;
}

/** The deck's single status line: listening, scoring, the combined verdict or the live cue. */
export const SpeakStatus = ({
  phase,
  outcome,
  error,
  ipa,
  drillId,
  isMastered,
  canJudgeMouth,
  hasSpeech,
  live,
  isScorerUnsure = false,
}: SpeakStatusProps): ReactElement => {
  const copy = useCopy();
  if (phase === 'listening')
    return (
      <p className="speak-check__line speak-check__line--live">
        <span className="speak-check__live-dot" aria-hidden="true" />
        {hasSpeech ? copy.speak.hearing : copy.speak.listening}
      </p>
    );
  if (phase === 'scoring') return <p className="speak-check__line">{copy.speak.scoring}</p>;
  if (phase === 'silent') return <p className="speak-check__line">{copy.speak.noSpeech}</p>;
  if (phase === 'result' && error) return <p className="speak-check__line">{error}</p>;
  if (phase === 'result' && outcome) {
    const soundLabel = outcome.sound ? copy.speak.verdict[outcome.sound] : copy.speak.verdict.none;
    const isMouthOk = outcome.kind === 'both' || outcome.kind === 'mouth' || !canJudgeMouth;
    const mouthLabel = !canJudgeMouth
      ? copy.speak.mouthNotNeeded
      : outcome.mouthRate === null
        ? copy.speak.mouthNone
        : isMouthOk
          ? copy.speak.mouthOk
          : copy.speak.mouthOff;
    return (
      <div className={cx('speak-check__result', `speak-check__result--${outcome.kind}`)}>
        <p className="speak-check__headline">
          {isMastered
            ? copy.speak.mastered
            : outcome.sound === 'check' && !outcome.isPass
              ? isScorerUnsure
                ? copy.speak.headlineScorerUnsure(ipa)
                : copy.speak.headlineClose
              : copy.speak.headline[outcome.kind]}
        </p>
        <p className="speak-check__pills">
          <span className={cx('speak-check__pill', outcome.sound === 'ok' && 'is-ok')}>
            {copy.speak.sound(ipa)}: {soundLabel}
          </span>
          <span className={cx('speak-check__pill', isMouthOk && 'is-ok')}>
            {copy.speak.mouth}: {mouthLabel}
          </span>
        </p>
        {isMastered ? (
          <Link
            href={{ pathname: '/practice', query: { sound: drillId } }}
            className="speak-check__link"
          >
            {copy.speak.practiceSentences}
          </Link>
        ) : null}
      </div>
    );
  }
  return <>{live ?? <p className="speak-check__line">{copy.speak.idleHint}</p>}</>;
};
