'use client';

import Link from 'next/link';
import type { ReactElement } from 'react';

import { Card } from '@/components/Card/Card';
import { Icon } from '@/components/Icon/Icon';
import { ListRow } from '@/components/ListRow/ListRow';
import { SectionHeader } from '@/components/SectionHeader/SectionHeader';
import { Skeleton } from '@/components/Skeleton/Skeleton';
import { Stat } from '@/components/Stat/Stat';
import { FOCUS_LIMIT } from '@/constants/api.constant';
import { AsyncStatus } from '@/enums/async-status.enum';
import { IconName } from '@/enums/icon-name.enum';
import { getSounds } from '@/features/content/services/content.service';
import { ApiStatusBanner } from '@/features/health/components/ApiStatusBanner';
import { getProgress } from '@/features/progress/services/progress.service';
import { useAsync } from '@/hooks/useAsync';
import { useCopy } from '@/hooks/useCopy';
import { targetPhoneOf } from '@/utils/drill.util';
import { formatDateTime, formatPercent } from '@/utils/format.util';

import './HomeScreen.css';

const QUICK = [
  { key: 'sounds', href: '/practice', icon: IconName.Practice },
  { key: 'pairs', href: '/practice', hash: 'items', icon: IconName.Sounds },
  { key: 'chart', href: '/sounds', icon: IconName.Info },
  { key: 'mirror', href: '/mirror', icon: IconName.Mirror },
  { key: 'progress', href: '/progress', icon: IconName.Progress },
] as const;

export const HomeScreen = (): ReactElement => {
  const copy = useCopy();
  const progress = useAsync(getProgress);
  const sounds = useAsync(getSounds);
  const phonemes = progress.data?.phonemes ?? [];
  const focus = phonemes
    .filter((stat) => stat.check + stat.error > 0)
    .sort((a, b) => b.check + b.error - (a.check + a.error))
    .slice(0, FOCUS_LIMIT);
  const totals = phonemes.reduce(
    (sum, stat) => ({ total: sum.total + stat.total, ok: sum.ok + stat.ok }),
    { total: 0, ok: 0 },
  );
  const last = progress.data?.recent[0] ?? null;
  const drillIdOf = (phoneme: string): string | null =>
    sounds.data?.find((sound) => targetPhoneOf(sound.arpabet) === phoneme)?.id ?? null;
  const quickCopy: Record<(typeof QUICK)[number]['key'], { title: string; hint: string }> = {
    sounds: { title: copy.home.sounds, hint: copy.home.soundsHint },
    pairs: { title: copy.home.pairs, hint: copy.home.pairsHint },
    chart: { title: copy.home.chart, hint: copy.home.chartHint },
    mirror: { title: copy.home.mirror, hint: copy.home.mirrorHint },
    progress: { title: copy.home.progress, hint: copy.home.progressHint },
  };

  return (
    <div className="home-screen">
      <section className="home-screen__hero" aria-labelledby="hero-title">
        <div className="home-screen__hero-text">
          <h1 id="hero-title" className="home-screen__title">
            {copy.appName}
          </h1>
          <p className="home-screen__tagline">{copy.tagline}</p>
          <div className="home-screen__cta">
            <Link href="/practice" className="button button--primary button--large">
              <Icon name={IconName.Practice} />
              {copy.home.heroCta}
            </Link>
            <Link href="/mirror" className="button button--ghost button--large">
              <Icon name={IconName.Mirror} />
              {copy.home.heroSecondary}
            </Link>
          </div>
        </div>
        <ApiStatusBanner />
      </section>

      <section className="home-screen__stats" aria-label={copy.progress.machine}>
        <Stat label={copy.home.statRuns} value={String(progress.data?.runs ?? 0)} />
        <Stat
          label={copy.home.statOkRate}
          value={totals.total ? formatPercent(totals.ok, totals.total) : '–'}
          tone={totals.total && totals.ok / totals.total >= 0.8 ? 'success' : 'neutral'}
        />
        <Stat label={copy.home.statSounds} value={String(phonemes.length)} />
      </section>

      <Card as="section" aria-labelledby="today-title">
        <SectionHeader
          id="today-title"
          title={copy.home.todayTitle}
          hint={focus.length > 0 ? copy.home.todayHint : undefined}
        />
        {progress.status === AsyncStatus.Loading ? <Skeleton lines={2} /> : null}
        {progress.status !== AsyncStatus.Loading && focus.length === 0 ? (
          <p className="home-screen__muted">{copy.home.todayEmpty}</p>
        ) : null}
        {focus.length > 0 ? (
          <div className="home-screen__focus">
            {focus.map((stat) => (
              <ListRow
                key={stat.phoneme}
                leading={<span className="ipa-pill">/{stat.ipa}/</span>}
                title={copy.home.reviewCount(stat.check + stat.error, stat.total)}
                trailing={copy.practice.practiceNow}
                href={
                  drillIdOf(stat.phoneme)
                    ? { pathname: '/practice', query: { sound: drillIdOf(stat.phoneme) } }
                    : { pathname: '/mirror', query: { sound: stat.phoneme } }
                }
              />
            ))}
          </div>
        ) : null}
      </Card>

      <section aria-labelledby="quick-title" className="home-screen__quick">
        <SectionHeader id="quick-title" title={copy.home.quick} />
        <ul className="home-screen__grid">
          {QUICK.map((entry) => (
            <li key={entry.key}>
              <Link
                href={'hash' in entry ? { pathname: entry.href, hash: entry.hash } : entry.href}
                className="home-screen__card"
              >
                <span className="home-screen__card-icon" aria-hidden="true">
                  <Icon name={entry.icon} />
                </span>
                <span className="home-screen__card-title">{quickCopy[entry.key].title}</span>
                <span className="home-screen__muted">{quickCopy[entry.key].hint}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <Card as="section" aria-labelledby="last-title">
        <SectionHeader id="last-title" title={copy.home.lastSession} />
        {last ? (
          <ListRow
            title={last.text}
            subtitle={`${formatDateTime(last.created_at)} · ${copy.practice.summary(last.ok, last.check, last.error)}`}
            trailing={copy.progress.view}
            href={{ pathname: '/practice', query: { run: last.id } }}
          />
        ) : (
          <p className="home-screen__muted">{copy.home.noSession}</p>
        )}
      </Card>
    </div>
  );
};
