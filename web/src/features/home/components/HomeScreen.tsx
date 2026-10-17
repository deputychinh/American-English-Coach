'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type ReactElement, useEffect } from 'react';

import { Card } from '@/components/Card/Card';
import { Icon } from '@/components/Icon/Icon';
import { ListRow } from '@/components/ListRow/ListRow';
import { SectionHeader } from '@/components/SectionHeader/SectionHeader';
import { Stat } from '@/components/Stat/Stat';
import { IconName } from '@/enums/icon-name.enum';
import { ApiStatusBanner } from '@/features/health/components/ApiStatusBanner';
import { isOnboarded } from '@/features/onboarding/services/onboarding.service';
import { PlanCard } from '@/features/plan/components/PlanCard';
import { getProgress } from '@/features/progress/services/progress.service';
import { useActiveProfile } from '@/hooks/useActiveProfile';
import { useAsync } from '@/hooks/useAsync';
import { useCopy } from '@/hooks/useCopy';
import { formatDateTime, formatPercent } from '@/utils/format.util';

import './HomeScreen.css';

const QUICK = [
  { key: 'course', href: '/course', icon: IconName.Sparkles },
  { key: 'sounds', href: '/practice', icon: IconName.Practice },
  { key: 'pairs', href: '/practice', hash: 'items', icon: IconName.Sounds },
  { key: 'chart', href: '/sounds', icon: IconName.Info },
  { key: 'mirror', href: '/mirror', icon: IconName.Mirror },
  { key: 'progress', href: '/progress', icon: IconName.Progress },
] as const;

export const HomeScreen = (): ReactElement => {
  const copy = useCopy();
  const router = useRouter();
  const profile = useActiveProfile();
  useEffect(() => {
    if (!isOnboarded()) router.replace('/welcome');
  }, [router]);
  const progress = useAsync(getProgress);
  const phonemes = progress.data?.phonemes ?? [];
  const totals = phonemes.reduce(
    (sum, stat) => ({ total: sum.total + stat.total, ok: sum.ok + stat.ok }),
    { total: 0, ok: 0 },
  );
  const last = progress.data?.recent[0] ?? null;
  const quickCopy: Record<(typeof QUICK)[number]['key'], { title: string; hint: string }> = {
    course: { title: copy.home.course, hint: copy.home.courseHint },
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
          <Link
            href={{ pathname: '/settings', hash: 'profiles' }}
            className="badge badge--subtle home-screen__profile"
            title={copy.home.changeProfile}
          >
            {copy.home.profileBadge(profile.name)}
          </Link>
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

      <PlanCard headingId="today-title" />

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
