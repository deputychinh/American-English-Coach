'use client';

import Link from 'next/link';
import { type ReactElement, useState } from 'react';

import { Button } from '@/components/Button/Button';
import { VerdictChip } from '@/components/VerdictChip/VerdictChip';
import { ButtonVariant } from '@/enums/button-variant.enum';
import { PhoneDetail } from '@/features/practice/components/PhoneDetail';
import { ProsodyList } from '@/features/practice/components/ProsodyList';
import { disputeRun } from '@/features/progress/services/progress.service';
import { TutorPanel } from '@/features/tutor/components/TutorPanel';
import { useTutorAvailability } from '@/features/tutor/hooks/useTutorAvailability';
import { explainRun } from '@/features/tutor/services/tutor.service';
import { useCopy } from '@/hooks/useCopy';
import type { Point2 } from '@/interfaces/mouth.interface';
import type { AssessmentResponse, PhoneResult, Recording } from '@/interfaces/practice.interface';

import './ResultCard.css';

interface ResultCardProps {
  result: AssessmentResponse;
  recording: Recording | null;
  outlineAt: (start: number, end: number) => Point2[];
  onRetry?: () => void;
}

export const ResultCard = ({
  result,
  recording,
  outlineAt,
  onRetry,
}: ResultCardProps): ReactElement => {
  const copy = useCopy();
  const [selected, setSelected] = useState<PhoneResult | null>(null);
  const [disputed, setDisputed] = useState(false);
  const [disputeError, setDisputeError] = useState<string | null>(null);
  const { summary } = result;
  const tutor = useTutorAvailability();

  const dispute = (): void => {
    disputeRun(result.id)
      .then(() => setDisputed(true))
      .catch((cause: unknown) =>
        setDisputeError(cause instanceof Error ? cause.message : String(cause)),
      );
  };

  return (
    <section className="result-card" aria-labelledby="result-title">
      <div className="result-card__head">
        <h2 id="result-title" className="result-card__title">
          {copy.practice.resultTitle}
        </h2>
        <p className="result-card__summary">
          {copy.practice.summary(summary.ok, summary.check, summary.error)} ·{' '}
          {summary.camera_used ? copy.practice.cameraUsed : copy.practice.cameraUnused}
        </p>
      </div>
      <ul className="result-card__totals" aria-hidden="true">
        <li className="result-card__total is-ok">
          <span className="result-card__total-value">{summary.ok}</span>
          <span>{copy.verdict.ok}</span>
        </li>
        <li className="result-card__total is-check">
          <span className="result-card__total-value">{summary.check}</span>
          <span>{copy.verdict.check}</span>
        </li>
        <li className="result-card__total is-error">
          <span className="result-card__total-value">{summary.error}</span>
          <span>{copy.verdict.error}</span>
        </li>
      </ul>

      <div className="result-card__words">
        {result.words.map((word) => (
          <div key={`${word.word}-${word.ipa}`} className="result-card__word">
            <span className="result-card__word-text">{word.word}</span>
            <span className="result-card__word-ipa">/{word.ipa}/</span>
            <div className="result-card__phones">
              {word.phones.map((phone, index) => (
                <VerdictChip
                  key={`${word.word}-${String(index)}-${phone.symbol}`}
                  ipa={phone.ipa}
                  verdict={phone.verdict}
                  isSelected={selected === phone}
                  onSelect={() => setSelected(selected === phone ? null : phone)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="result-card__muted">{copy.practice.phoneDetailHint}</p>

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
