import type { ReactElement, ReactNode } from 'react';

import './EmptyState.css';

interface EmptyStateProps {
  message: string;
  children?: ReactNode;
}

export const EmptyState = ({ message, children }: EmptyStateProps): ReactElement => (
  <div className="empty-state">
    <p className="empty-state__message">{message}</p>
    {children}
  </div>
);
