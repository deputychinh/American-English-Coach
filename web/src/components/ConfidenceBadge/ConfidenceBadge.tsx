'use client';

import type { ReactElement } from 'react';

import { useCopy } from '@/hooks/useCopy';
import { cx } from '@/utils/cx.util';

import './ConfidenceBadge.css';

interface ConfidenceBadgeProps {
  confidence: string | null | undefined;
  /** Labels from the API (`confidence_labels`); the built-in copy is the fallback. */
  labels?: Record<string, string>;
}

const GLYPH: Record<string, string> = { high: '●', medium: '◐', low: '○' };

/** How much the camera can see of a sound: glyph + text, never colour alone. */
export const ConfidenceBadge = ({ confidence, labels }: ConfidenceBadgeProps): ReactElement => {
  const copy = useCopy();
  const level = confidence && confidence in GLYPH ? confidence : 'low';
  const fallback = copy.sounds.confidence as Record<string, string>;
  const label = labels?.[level] ?? fallback[level] ?? level;
  return (
    <span className={cx('confidence-badge', `confidence-badge--${level}`)}>
      <span aria-hidden="true">{GLYPH[level]}</span>
      <span>{label}</span>
    </span>
  );
};
