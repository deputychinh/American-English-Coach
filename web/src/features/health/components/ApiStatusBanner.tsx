'use client';

import type { ReactElement } from 'react';

import { COPY } from '@/constants/copy.constant';
import { AsyncStatus } from '@/enums/async-status.enum';
import { getHealth } from '@/features/health/services/health.service';
import { useAsync } from '@/hooks/useAsync';
import { cx } from '@/utils/cx.util';

import './ApiStatusBanner.css';

const describe = (
  health: Awaited<ReturnType<typeof getHealth>>,
): { text: string; tone: string } => {
  if (health === null) return { text: COPY.status.offline, tone: 'danger' };
  if (!health.realtime_enabled) return { text: COPY.status.disabled, tone: 'warning' };
  if (!health.model_ready) return { text: COPY.status.modelMissing, tone: 'warning' };
  return { text: COPY.status.ready, tone: 'success' };
};

export const ApiStatusBanner = (): ReactElement => {
  const { status, data } = useAsync(getHealth);
  const isLoading = status === AsyncStatus.Loading || status === AsyncStatus.Idle;
  const { text, tone } = isLoading
    ? { text: COPY.status.checking, tone: 'neutral' }
    : describe(data);
  return (
    <p className={cx('api-status-banner', `api-status-banner--${tone}`)} role="status">
      <span className="api-status-banner__dot" aria-hidden="true" />
      <span>{text}</span>
    </p>
  );
};
