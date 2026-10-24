'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { ReactElement } from 'react';

import { TODAY_FROM } from '@/constants/today.constant';
import { useCopy } from '@/hooks/useCopy';

/** True when the screen was opened from today's session (`?from=today`). */
export const useIsFromToday = (): boolean => useSearchParams().get('from') === TODAY_FROM;

/** "Back to today's session", shown only on screens the session opened. */
export const TodaySessionLink = (): ReactElement | null => {
  const copy = useCopy().session;
  if (!useIsFromToday()) return null;
  return (
    <Link href="/today" className="button button--primary">
      {copy.backToSession}
    </Link>
  );
};
