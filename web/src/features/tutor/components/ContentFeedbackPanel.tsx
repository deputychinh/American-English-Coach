'use client';

import { type ReactElement, useState } from 'react';

import { Button } from '@/components/Button/Button';
import { ButtonVariant } from '@/enums/button-variant.enum';
import { useReferenceAudio } from '@/features/practice/hooks/useReferenceAudio';
import { useDictation } from '@/features/tutor/hooks/useDictation';
import { useTutorAvailability } from '@/features/tutor/hooks/useTutorAvailability';
import { askFeedback } from '@/features/tutor/services/feedback.service';
import { useCopy } from '@/hooks/useCopy';
import type { ContentFeedback } from '@/interfaces/feedback.interface';

import './ContentFeedbackPanel.css';

interface ContentFeedbackPanelProps {
  /** The task in Vietnamese, sent along so the tutor can judge the formality. */
  taskVi: string | null;
}

/**
 * Plan v2 V6: grammar, word choice and formality of what the learner said, from the AI tutor.
 * Only text goes out (typed, or dictated by the browser); one point is shown at a time and
 * pronunciation is never discussed, which the API enforces as well.
 */
export const ContentFeedbackPanel = ({ taskVi }: ContentFeedbackPanelProps): ReactElement => {
  const copy = useCopy().feedback;
  const tutor = useTutorAvailability();
  const reference = useReferenceAudio();
  const [transcript, setTranscript] = useState('');
  const [result, setResult] = useState<ContentFeedback | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAsking, setIsAsking] = useState(false);
  const dictation = useDictation((said) =>
    setTranscript((current) => (current ? `${current} ${said}` : said)),
  );

  if (!tutor.isAvailable) {
    return (
      <section className="content-feedback-panel" aria-labelledby="content-feedback-title">
        <h2 id="content-feedback-title" className="content-feedback-panel__title">
          {copy.title}
        </h2>
        <p className="content-feedback-panel__note">{copy.unavailable}</p>
      </section>
    );
  }

  const ask = (): void => {
    dictation.stop();
    setIsAsking(true);
    setError(null);
    askFeedback({ transcript, taskVi })
      .then(setResult)
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : String(cause)))
      .finally(() => setIsAsking(false));
  };
  const others = result ? result.grammar.length + result.word_choice.length - 1 : 0;

  return (
    <section className="content-feedback-panel" aria-labelledby="content-feedback-title">
      <h2 id="content-feedback-title" className="content-feedback-panel__title">
        {copy.title}
      </h2>
      <p className="content-feedback-panel__note">{copy.lead}</p>
      <label className="content-feedback-panel__field">
        <span>{copy.label}</span>
        <textarea
          className="content-feedback-panel__input"
          lang="en"
          rows={4}
          maxLength={800}
          value={transcript}
          placeholder={copy.placeholder}
          onChange={(event) => setTranscript(event.target.value)}
        />
      </label>
      <div className="content-feedback-panel__actions">
        {dictation.isSupported ? (
          <Button
            isSmall
            variant={ButtonVariant.Secondary}
            onClick={dictation.isListening ? dictation.stop : dictation.start}
          >
            {dictation.isListening ? copy.stopDictate : copy.dictate}
          </Button>
        ) : null}
        <Button isSmall disabled={isAsking || transcript.trim() === ''} onClick={ask}>
          {isAsking ? copy.asking : copy.ask}
        </Button>
      </div>
      {dictation.isSupported ? (
        <p className="content-feedback-panel__hint">{copy.dictateNote}</p>
      ) : null}
      {error ? (
        <p className="content-feedback-panel__error" role="alert">
          {error}
        </p>
      ) : null}
      {result ? (
        <div className="content-feedback-panel__result" aria-live="polite">
          {result.focus ? (
            <div className="content-feedback-panel__focus">
              <p className="content-feedback-panel__label">
                {copy.focusTitle} · {copy.kind[result.focus.kind]}
              </p>
              <p className="content-feedback-panel__change">
                <del lang="en">{result.focus.wrong}</del> →{' '}
                <ins lang="en">{result.focus.right}</ins>
              </p>
              <p className="content-feedback-panel__note">{result.focus.explain_vi}</p>
            </div>
          ) : (
            <p className="content-feedback-panel__good">{copy.noIssue}</p>
          )}
          {result.formality ? (
            <p className="content-feedback-panel__note">
              {copy.formality(copy.levels[result.formality])}
              {result.formality_note_vi ? ` · ${result.formality_note_vi}` : ''}
            </p>
          ) : null}
          {result.better_version ? (
            <div className="content-feedback-panel__better">
              <p className="content-feedback-panel__label">{copy.better}</p>
              <p lang="en">{result.better_version}</p>
              <Button
                isSmall
                variant={ButtonVariant.Ghost}
                onClick={() => reference.play(result.better_version ?? '')}
              >
                {copy.listenBetter}
              </Button>
            </div>
          ) : null}
          {others > 0 ? (
            <details className="content-feedback-panel__more">
              <summary>{copy.more(others)}</summary>
              <ul className="content-feedback-panel__list">
                {[...result.grammar, ...result.word_choice].slice(1).map((issue) => (
                  <li key={`${issue.kind}:${issue.wrong}`}>
                    <span lang="en">
                      {issue.wrong} → {issue.right}
                    </span>
                    <small className="content-feedback-panel__note">{issue.explain_vi}</small>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>
      ) : null}
    </section>
  );
};
