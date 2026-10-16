import type { ReactElement } from 'react';

import { COPY } from '@/constants/copy.constant';

import './Skeleton.css';

interface SkeletonProps {
  lines?: number;
  label?: string;
}

/** Loading placeholder; announced once to screen readers via the status role. */
export const Skeleton = ({
  lines = 3,
  label = COPY.common.loading,
}: SkeletonProps): ReactElement => (
  <div className="skeleton" role="status" aria-live="polite" aria-label={label}>
    {Array.from({ length: lines }, (_, index) => (
      <span key={`line-${String(index)}`} className="skeleton__line" aria-hidden="true" />
    ))}
  </div>
);
