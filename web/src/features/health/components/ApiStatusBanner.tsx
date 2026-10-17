'use client';

import type { ReactElement } from 'react';

import { AsyncStatus } from '@/enums/async-status.enum';
import { getHealth } from '@/features/health/services/health.service';
import { useAsync } from '@/hooks/useAsync';
import { useCopy } from '@/hooks/useCopy';
import type { Copy } from '@/interfaces/copy.interface';
import { cx } from '@/utils/cx.util';
import './ApiStatusBanner.css';

const describe = (
  health: Awaited<ReturnType<typeof getHealth>>,
  copy: Copy,
): { text: string; tone: string } => {
  if (health === null) return { text: copy.status.offline, tone: 'danger' };
  if (!health.realtime_enabled) return { text: copy.status.disabled, tone: 'warning' };
  if (!health.model_ready) return { text: copy.status.modelMissing, tone: 'warning' };
  return { text: copy.status.ready, tone: 'success' };
};

export const ApiStatusBanner = (): ReactElement => {
  const copy = useCopy();
  const { status, data } = useAsync(getHealth);
  const isLoading = status === AsyncStatus.Loading || status === AsyncStatus.Idle;
  const { text, tone } = isLoading
    ? { text: copy.status.checking, tone: 'neutral' }
    : describe(data, copy);
  return (
    <p className={cx('api-status-banner', `api-status-banner--${tone}`)} role="status">
      <span className="api-status-banner__dot" aria-hidden="true" />
      <span>{text}</span>
    </p>
  );
};
