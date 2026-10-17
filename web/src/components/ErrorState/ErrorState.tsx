'use client';

import type { ReactElement } from 'react';

import { Button } from '@/components/Button/Button';
import { ButtonVariant } from '@/enums/button-variant.enum';
import { useCopy } from '@/hooks/useCopy';
import './ErrorState.css';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export const ErrorState = ({ title, message, onRetry }: ErrorStateProps): ReactElement => {
  const copy = useCopy();
  return (
    <div className="error-state" role="alert">
      <p className="error-state__title">{title ?? copy.common.errorTitle}</p>
      <p className="error-state__message">{message}</p>
      {onRetry ? (
        <Button variant={ButtonVariant.Ghost} isSmall onClick={onRetry}>
          {copy.common.retry}
        </Button>
      ) : null}
    </div>
  );
};
