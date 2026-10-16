'use client';

import Link from 'next/link';
import { type ReactElement, useState } from 'react';

import { Button } from '@/components/Button/Button';
import { VerdictChip } from '@/components/VerdictChip/VerdictChip';
import { COPY } from '@/constants/copy.constant';
import { ButtonVariant } from '@/enums/button-variant.enum';
import { PhoneDetail } from '@/features/practice/components/PhoneDetail';
import { ProsodyList } from '@/features/practice/components/ProsodyList';
import { disputeRun } from '@/features/progress/services/progress.service';
import { TutorPanel } from '@/features/tutor/components/TutorPanel';
import { useTutorAvailability } from '@/features/tutor/hooks/useTutorAvailability';
import { explainRun } from '@/features/tutor/services/tutor.service';
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
          {COPY.practice.resultTitle}
        </h2>
        <p className="result-card__summary">
          {COPY.practice.summary(summary.ok, summary.check, summary.error)} ·{' '}
          {summary.camera_used ? COPY.practice.cameraUsed : COPY.practice.cameraUnused}
        </p>
      </div>
      <ul className="result-card__totals" aria-hidden="true">
        <li className="result-card__total is-ok">
          <span className="result-card__total-value">{summary.ok}</span>
          <span>{COPY.verdict.ok}</span>
        </li>
        <li className="result-card__total is-check">
          <span className="result-card__total-value">{summary.check}</span>
          <span>{COPY.verdict.check}</span>
        </li>
        <li className="result-card__total is-error">
          <span className="result-card__total-value">{summary.error}</span>
          <span>{COPY.verdict.error}</span>
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
      <p className="result-card__muted">{COPY.practice.phoneDetailHint}</p>

      {selected ? (
        <PhoneDetail phone={selected} outline={outlineAt(selected.start, selected.end)} />
      ) : null}

      {summary.focus.length > 0 ? (
        <div className="result-card__focus">
          <h3 className="result-card__subtitle">{COPY.practice.focusTitle}</h3>
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
                  {COPY.practice.practiceNow}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <ProsodyList findings={result.prosody} />

      {tutor.isAvailable ? (
        <TutorPanel
          title={COPY.tutor.panelTitle}
          buttonLabel={COPY.tutor.explain}
          request={() => explainRun(result.id)}
        />
      ) : null}

      <div className="result-card__actions">
        {onRetry ? <Button onClick={onRetry}>{COPY.practice.retry}</Button> : null}
        {recording ? (
          <Button
            variant={ButtonVariant.Ghost}
            onClick={() => void new Audio(recording.url).play()}
          >
            {COPY.practice.playback}
          </Button>
        ) : null}
        {disputed ? (
          <p role="status" className="result-card__muted">
            {COPY.practice.disputed}
          </p>
        ) : (
          <Button variant={ButtonVariant.Ghost} onClick={dispute}>
            {COPY.practice.dispute}
          </Button>
        )}
        {disputeError ? <p className="result-card__error">{disputeError}</p> : null}
      </div>
      <p className="result-card__muted">model: {result.model_version}</p>
    </section>
  );
};
