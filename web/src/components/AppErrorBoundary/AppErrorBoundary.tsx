'use client';

import type { ReactElement, ReactNode } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import { Button } from '@/components/Button/Button';
import { Icon } from '@/components/Icon/Icon';
import { IconName } from '@/enums/icon-name.enum';
import { useCopy } from '@/hooks/useCopy';

import './AppErrorBoundary.css';

const Fallback = (): ReactElement => {
  const copy = useCopy();
  return (
    <div className="app-error-boundary" role="alert">
      <Icon name={IconName.Alert} className="app-error-boundary__icon" />
      <h1 className="app-error-boundary__title">{copy.errorBoundary.title}</h1>
      <p className="app-error-boundary__message">{copy.errorBoundary.message}</p>
      <Button onClick={() => window.location.reload()}>{copy.errorBoundary.reload}</Button>
    </div>
  );
};

interface AppErrorBoundaryProps {
  children: ReactNode;
}

/** Last line of defence: a friendly screen instead of a blank page when rendering throws. */
export const AppErrorBoundary = ({ children }: AppErrorBoundaryProps): ReactElement => (
  <ErrorBoundary FallbackComponent={Fallback}>{children}</ErrorBoundary>
);
