'use client';

import Link from 'next/link';
import type { ReactElement } from 'react';

import { loadToday } from '@/features/today/services/today.service';
import { useAsync } from '@/hooks/useAsync';
import { useCopy } from '@/hooks/useCopy';

import './TodayHomeCard.css';

/** Home's one tap into today's 15 minutes, with how much of it is done. */
export const TodayHomeCard = (): ReactElement | null => {
  const copy = useCopy().session;
  const today = useAsync(loadToday).data;
  if (!today) return null;
  const total = today.steps.length;
  const { next, done } = today;
  return (
    <section className="today-home-card" aria-labelledby="today-home-title">
      <div className="today-home-card__text">
        <h2 id="today-home-title" className="today-home-card__title">
          {copy.homeTitle}
        </h2>
        <p className="today-home-card__line">{next ? copy.homeLine(done, total) : copy.homeDone}</p>
        <div
          className="today-home-card__bar"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={done}
          aria-label={copy.progress(done, total)}
        >
          <span
            className="today-home-card__fill"
            style={{ inlineSize: `${String(Math.round((100 * done) / total))}%` }}
          />
        </div>
      </div>
      <Link href="/today" className="button button--primary">
        {next && done > 0 ? copy.resume(copy.steps[next.step]) : copy.start}
      </Link>
    </section>
  );
};
