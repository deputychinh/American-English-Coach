'use client';

import Link from 'next/link';
import type { ReactElement } from 'react';

import { Skeleton } from '@/components/Skeleton/Skeleton';
import { FOCUS_LIMIT } from '@/constants/api.constant';
import { COPY } from '@/constants/copy.constant';
import { AsyncStatus } from '@/enums/async-status.enum';
import { ApiStatusBanner } from '@/features/health/components/ApiStatusBanner';
import { getProgress } from '@/features/progress/services/progress.service';
import { useAsync } from '@/hooks/useAsync';

import './HomeScreen.css';

const QUICK = [
  { href: '/practice', title: COPY.home.pairs, hint: COPY.home.pairsHint },
  {
    href: '/practice',
    title: COPY.home.sentences,
    hint: COPY.home.sentencesHint,
    hash: 'sentences',
  },
  { href: '/sounds', title: COPY.home.chart, hint: COPY.home.chartHint },
  { href: '/mirror', title: COPY.home.mirror, hint: COPY.home.mirrorHint },
  { href: '/progress', title: COPY.home.progress, hint: COPY.home.progressHint },
] as const;

export const HomeScreen = (): ReactElement => {
  const progress = useAsync(getProgress);
  const focus = (progress.data?.phonemes ?? [])
    .filter((stat) => stat.check + stat.error > 0)
    .sort((a, b) => b.check + b.error - (a.check + a.error))
    .slice(0, FOCUS_LIMIT);

  return (
    <div className="home-screen">
      <section className="home-screen__hero">
        <h1 className="home-screen__title">{COPY.appName}</h1>
        <p className="home-screen__tagline">{COPY.tagline}</p>
        <ApiStatusBanner />
      </section>

      <section className="home-screen__panel" aria-labelledby="today-title">
        <h2 id="today-title" className="home-screen__heading">
          {COPY.home.todayTitle}
        </h2>
        {progress.status === AsyncStatus.Loading ? <Skeleton lines={2} /> : null}
        {progress.status !== AsyncStatus.Loading && focus.length === 0 ? (
          <p className="home-screen__muted">{COPY.home.todayEmpty}</p>
        ) : null}
        {focus.length > 0 ? (
          <ul className="home-screen__focus">
            {focus.map((stat) => (
              <li key={stat.phoneme} className="home-screen__focus-item">
                <span className="home-screen__ipa">/{stat.ipa}/</span>
                <span className="home-screen__muted">
                  {stat.check + stat.error}/{stat.total} lần cần xem lại
                </span>
                <Link href={{ pathname: '/mirror', query: { sound: stat.phoneme } }}>
                  {COPY.practice.practiceNow}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
        {focus.length > 0 ? <p className="home-screen__muted">{COPY.home.todayHint}</p> : null}
      </section>

      <section aria-labelledby="quick-title">
        <h2 id="quick-title" className="home-screen__heading">
          {COPY.home.quick}
        </h2>
        <ul className="home-screen__grid">
          {QUICK.map((entry) => (
            <li key={entry.title}>
              <Link
                href={'hash' in entry ? { pathname: entry.href, hash: entry.hash } : entry.href}
                className="home-screen__card"
              >
                <span className="home-screen__card-title">{entry.title}</span>
                <span className="home-screen__muted">{entry.hint}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};
