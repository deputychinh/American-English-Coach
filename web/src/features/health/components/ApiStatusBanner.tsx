'use client';

import Link from 'next/link';
import type { ReactElement } from 'react';

import { AsyncStatus } from '@/enums/async-status.enum';
import { getHealth } from '@/features/health/services/health.service';
import { useAsync } from '@/hooks/useAsync';
import { useCopy } from '@/hooks/useCopy';
import type { Copy } from '@/interfaces/copy.interface';
import { isNativeShell } from '@/utils/api-base.util';
import { cx } from '@/utils/cx.util';
import './ApiStatusBanner.css';

const describe = (
  health: Awaited<ReturnType<typeof getHealth>>,
  copy: Copy,
): { text: string; tone: string; isUnconfigured?: boolean } => {
  // In the iOS shell the API is another machine: point the learner at the address field.
  if (health === null && isNativeShell())
    return { text: copy.status.offlineNative, tone: 'danger', isUnconfigured: true };
  if (health === null) return { text: copy.status.offline, tone: 'danger' };
  if (!health.realtime_enabled) return { text: copy.status.disabled, tone: 'warning' };
  if (!health.model_ready) return { text: copy.status.modelMissing, tone: 'warning' };
  return { text: copy.status.ready, tone: 'success' };
};

interface ApiStatusBannerProps {
  /** Render nothing while checking and when the server is ready (home only shows problems). */
  isQuietWhenReady?: boolean;
}

export const ApiStatusBanner = ({
  isQuietWhenReady = false,
}: ApiStatusBannerProps): ReactElement | null => {
  const copy = useCopy();
  const { status, data } = useAsync(getHealth);
  const isLoading = status === AsyncStatus.Loading || status === AsyncStatus.Idle;
  const { text, tone, isUnconfigured } = isLoading
    ? { text: copy.status.checking, tone: 'neutral' }
    : describe(data, copy);
  if (isQuietWhenReady && (isLoading || tone === 'success')) return null;
  return (
    <p className={cx('api-status-banner', `api-status-banner--${tone}`)} role="status">
      <span className="api-status-banner__dot" aria-hidden="true" />
      <span>{text}</span>
      {isUnconfigured ? (
        <Link href="/settings" className="api-status-banner__link">
          {copy.status.openSettings}
        </Link>
      ) : null}
    </p>
  );
};
