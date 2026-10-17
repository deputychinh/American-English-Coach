'use client';

import { type ReactElement, useState } from 'react';

import { Button } from '@/components/Button/Button';
import { AsyncStatus } from '@/enums/async-status.enum';
import { ButtonVariant } from '@/enums/button-variant.enum';
import { useCopy } from '@/hooks/useCopy';
import type { TutorReply } from '@/interfaces/practice.interface';

import './TutorPanel.css';

interface TutorPanelProps {
  title: string;
  buttonLabel: string;
  request: () => Promise<TutorReply>;
  /** When set, the first click shows this line and a send/cancel pair before anything is sent. */
  confirmLine?: string;
}

/** Generic "ask the tutor" block: button → (confirm) → loading → answer or error. */
export const TutorPanel = ({
  title,
  buttonLabel,
  request,
  confirmLine,
}: TutorPanelProps): ReactElement => {
  const copy = useCopy();
  const [status, setStatus] = useState(AsyncStatus.Idle);
  const [isConfirming, setIsConfirming] = useState(false);
  const [reply, setReply] = useState<TutorReply | null>(null);
  const [error, setError] = useState<string | null>(null);

  const send = (): void => {
    setIsConfirming(false);
    setStatus(AsyncStatus.Loading);
    setError(null);
    request()
      .then((answer) => {
        setReply(answer);
        setStatus(AsyncStatus.Success);
      })
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : String(cause));
        setStatus(AsyncStatus.Error);
      });
  };
  const ask = (): void => {
    if (confirmLine) setIsConfirming(true);
    else send();
  };

  return (
    <section className="tutor-panel" aria-label={title}>
      <div className="tutor-panel__actions">
        <Button
          variant={ButtonVariant.Secondary}
          onClick={ask}
          disabled={status === AsyncStatus.Loading || isConfirming}
        >
          {buttonLabel}
        </Button>
        {isConfirming ? (
          <span className="tutor-panel__confirm" role="status">
            <span>{confirmLine}</span>
            <Button isSmall onClick={send}>
              {copy.tutor.send}
            </Button>
            <Button isSmall variant={ButtonVariant.Ghost} onClick={() => setIsConfirming(false)}>
              {copy.tutor.cancel}
            </Button>
          </span>
        ) : null}
      </div>
      {status === AsyncStatus.Loading ? (
        <p className="tutor-panel__muted" role="status">
          {copy.tutor.loading}
        </p>
      ) : null}
      {status === AsyncStatus.Error && error ? (
        <p className="tutor-panel__error" role="alert">
          {error}
        </p>
      ) : null}
      {reply ? (
        <div className="tutor-panel__answer" role="region" aria-live="polite">
          <p className="tutor-panel__title">{title}</p>
          <p className="tutor-panel__text">{reply.text_vi}</p>
          <p className="tutor-panel__muted">
            {copy.tutor.modelLabel}: {reply.model}
          </p>
        </div>
      ) : null}
    </section>
  );
};
