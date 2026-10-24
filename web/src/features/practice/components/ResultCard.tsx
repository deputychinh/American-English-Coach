'use client';

import Link from 'next/link';
import { type ReactElement, type ReactNode, useState } from 'react';

import { Button } from '@/components/Button/Button';
import { VerdictChip } from '@/components/VerdictChip/VerdictChip';
import { ButtonVariant } from '@/enums/button-variant.enum';
import { PhoneDetail } from '@/features/practice/components/PhoneDetail';
import { PitchCompare } from '@/features/practice/components/PitchCompare';
import { ProsodyList } from '@/features/practice/components/ProsodyList';
import { ScoreRing } from '@/features/practice/components/ScoreRing';
import { disputeRun } from '@/features/progress/services/progress.service';
import { TutorPanel } from '@/features/tutor/components/TutorPanel';
import { useTutorAvailability } from '@/features/tutor/hooks/useTutorAvailability';
import { explainRun } from '@/features/tutor/services/tutor.service';
import { useCopy } from '@/hooks/useCopy';
import type { Point2 } from '@/interfaces/mouth.interface';
import type { AssessmentResponse, Recording } from '@/interfaces/practice.interface';
import { cx } from '@/utils/cx.util';
import { scorePercent, scoreTone } from '@/utils/score.util';
import {
  firstWorstIndex,
  verdictGlyph,
  verdictLabel,
  verdictModifier,
  worstVerdict,
} from '@/utils/verdict.util';

import './ResultCard.css';

interface ResultCardProps {
  result: AssessmentResponse;
  recording: Recording | null;
  outlineAt: (start: number, end: number) => Point2[];
  onRetry?: () => void;
  /** Drawn inside a sheet: no card frame of its own. */
  isBare?: boolean;
  /** Drill navigation shown with the result (next / skip). */
  extraActions?: ReactNode;
}

export const ResultCard = ({
  result,
  recording,
  outlineAt,
  onRetry,
  isBare = false,
  extraActions,
}: ResultCardProps): ReactElement => {
  const copy = useCopy();
  const { words } = result;
  const wordVerdicts = words.map((word) => worstVerdict(word.phones.map((phone) => phone.verdict)));
  // Open on the first word that needs work, and inside it on its weakest sound (BoldVoice style).
  const [wordIndex, setWordIndex] = useState(() => firstWorstIndex(wordVerdicts));
  const [phoneIndex, setPhoneIndex] = useState<number | null>(null);
  const [disputed, setDisputed] = useState(false);
  const [disputeError, setDisputeError] = useState<string | null>(null);
  const { summary } = result;
  const total = summary.ok + summary.check + summary.error;
  const tone = scoreTone(scorePercent(summary.ok, summary.check, total));
  const word = words[wordIndex] ?? null;
  const shownPhoneIndex = word
    ? (phoneIndex ?? firstWorstIndex(word.phones.map((phone) => phone.verdict)))
    : 0;
  const selected = word?.phones[shownPhoneIndex] ?? null;
  const tutor = useTutorAvailability();

  const dispute = (): void => {
    disputeRun(result.id)
      .then(() => setDisputed(true))
      .catch((cause: unknown) =>
        setDisputeError(cause instanceof Error ? cause.message : String(cause)),
      );
  };

  return (
    <section
      className={cx('result-card', isBare && 'result-card--bare')}
      aria-labelledby="result-title"
    >
      <div className="result-card__head">
        <ScoreRing ok={summary.ok} check={summary.check} total={total} />
        <div className="result-card__head-text">
          <h2 id="result-title" className="result-card__title visually-hidden">
            {copy.practice.resultTitle}
          </h2>
          <p className={cx('result-card__headline', `result-card__headline--${tone}`)}>
            {copy.practice.headline[tone]}
          </p>
          <p className="result-card__summary">
            {copy.practice.summary(summary.ok, summary.check, summary.error)} ·{' '}
            {summary.camera_used ? copy.practice.cameraUsed : copy.practice.cameraUnused}
          </p>
        </div>
      </div>
      {extraActions ? <div className="result-card__next">{extraActions}</div> : null}

      {words.length > 1 ? (
        <div className="result-card__sentence" role="group" aria-label={copy.practice.wordsAria}>
          {words.map((item, index) => {
            const verdict = wordVerdicts[index] ?? item.phones[0]?.verdict;
            return (
              <button
                key={`${item.word}-${String(index)}`}
                type="button"
                className={cx(
                  'result-card__word-chip',
                  verdict && verdictModifier(verdict),
                  index === wordIndex && 'is-selected',
                )}
                aria-pressed={index === wordIndex}
                aria-label={copy.practice.wordAria(item.word, verdict ? verdictLabel(verdict) : '')}
                onClick={() => {
                  setWordIndex(index);
                  setPhoneIndex(null);
                }}
              >
                {item.word}
                {verdict ? (
                  <span className="result-card__word-mark" aria-hidden="true">
                    {verdictGlyph(verdict)}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}

      {word ? (
        <div className="result-card__word">
          <span className="result-card__word-text">{word.word}</span>
          <span className="result-card__word-ipa">/{word.ipa}/</span>
          <div className="result-card__phones">
            {word.phones.map((phone, index) => (
              <VerdictChip
                key={`${word.word}-${String(index)}-${phone.symbol}`}
                ipa={phone.ipa}
                verdict={phone.verdict}
                isSelected={index === shownPhoneIndex}
                onSelect={() => setPhoneIndex(index)}
              />
            ))}
          </div>
        </div>
      ) : null}
      <p className="result-card__muted">
        {words.length > 1 ? copy.practice.wordHint : copy.practice.phoneDetailHint}
      </p>

      {selected ? (
        <PhoneDetail phone={selected} outline={outlineAt(selected.start, selected.end)} />
      ) : null}

      {summary.focus.length > 0 ? (
        <div className="result-card__focus">
          <h3 className="result-card__subtitle">{copy.practice.focusTitle}</h3>
          <ul className="result-card__focus-list">
            {summary.focus.map((focus) => (
              <li key={focus.error_id} className="result-card__focus-item">
                <span className="result-card__focus-ipa">/{focus.ipa}/</span>
                <span>{focus.hint_vi}</span>
                <Link
                  href={{
                    pathname: '/mirror',
                    query: { sound: focus.phoneme, item: result.item_id },
                  }}
                  className="button button--secondary button--small"
                >
                  {copy.practice.practiceNow}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {recording && result.words.length > 1 ? (
        <PitchCompare text={result.text} recording={recording.blob} />
      ) : null}
      <ProsodyList findings={result.prosody} />

      {tutor.isAvailable ? (
        <TutorPanel
          title={copy.tutor.panelTitle}
          buttonLabel={copy.tutor.explain}
          request={() => explainRun(result.id)}
        />
      ) : null}

      <div className="result-card__actions">
        {onRetry ? <Button onClick={onRetry}>{copy.practice.retry}</Button> : null}
        {recording ? (
          <Button
            variant={ButtonVariant.Ghost}
            onClick={() => void new Audio(recording.url).play()}
          >
            {copy.practice.playback}
          </Button>
        ) : null}
        {disputed ? (
          <p role="status" className="result-card__muted">
            {copy.practice.disputed}
          </p>
        ) : (
          <Button variant={ButtonVariant.Ghost} onClick={dispute}>
            {copy.practice.dispute}
          </Button>
        )}
        {disputeError ? <p className="result-card__error">{disputeError}</p> : null}
      </div>
      <p className="result-card__muted">model: {result.model_version}</p>
    </section>
  );
};
