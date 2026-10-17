'use client';

import type { ReactElement } from 'react';

import { useCopy } from '@/hooks/useCopy';
import './Skeleton.css';

interface SkeletonProps {
  lines?: number;
  label?: string;
}

/** Loading placeholder; announced once to screen readers via the status role. */
export const Skeleton = ({ lines = 3, label }: SkeletonProps): ReactElement => {
  const copy = useCopy();
  return (
    <div
      className="skeleton"
      role="status"
      aria-live="polite"
      aria-label={label ?? copy.common.loading}
    >
      {Array.from({ length: lines }, (_, index) => (
        <span key={`line-${String(index)}`} className="skeleton__line" aria-hidden="true" />
      ))}
    </div>
  );
};
