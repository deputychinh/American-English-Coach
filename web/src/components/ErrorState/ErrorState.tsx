import type { ReactElement } from 'react';

import { Button } from '@/components/Button/Button';
import { COPY } from '@/constants/copy.constant';
import { ButtonVariant } from '@/enums/button-variant.enum';

import './ErrorState.css';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export const ErrorState = ({
  title = COPY.common.errorTitle,
  message,
  onRetry,
}: ErrorStateProps): ReactElement => (
  <div className="error-state" role="alert">
    <p className="error-state__title">{title}</p>
    <p className="error-state__message">{message}</p>
    {onRetry ? (
      <Button variant={ButtonVariant.Ghost} isSmall onClick={onRetry}>
        {COPY.common.retry}
      </Button>
    ) : null}
  </div>
);
