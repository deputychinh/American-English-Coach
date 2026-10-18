'use client';

import Link from 'next/link';
import { type ReactElement, useState } from 'react';

import { Card } from '@/components/Card/Card';
import { EmptyState } from '@/components/EmptyState/EmptyState';
import { ErrorState } from '@/components/ErrorState/ErrorState';
import { Icon } from '@/components/Icon/Icon';
import { ListRow } from '@/components/ListRow/ListRow';
import { PageIntro } from '@/components/PageIntro/PageIntro';
import { SectionHeader } from '@/components/SectionHeader/SectionHeader';
import { Skeleton } from '@/components/Skeleton/Skeleton';
import { Stat } from '@/components/Stat/Stat';
import { Tabs } from '@/components/Tabs/Tabs';
import { AsyncStatus } from '@/enums/async-status.enum';
import { IconName } from '@/enums/icon-name.enum';
import { getSounds } from '@/features/content/services/content.service';
import { PlanCard } from '@/features/plan/components/PlanCard';
import { getProgress } from '@/features/progress/services/progress.service';
import { useAsync } from '@/hooks/useAsync';
import { useCopy } from '@/hooks/useCopy';
import { targetPhoneOf } from '@/utils/drill.util';
import { formatDateTime, formatPercent } from '@/utils/format.util';

import './ProgressDashboard.css';

export const ProgressDashboard = (): ReactElement => {
  const copy = useCopy();
  const { status, data, error, reload } = useAsync(getProgress);
  const sounds = useAsync(getSounds);
  const [panel, setPanel] = useState<'sounds' | 'recent'>('sounds');
  const drillIdOf = (phoneme: string): string | null =>
    sounds.data?.find((sound) => targetPhoneOf(sound.arpabet) === phoneme)?.id ?? null;
  const ranked = [...(data?.phonemes ?? [])].sort(
    (a, b) => b.check + b.error - (a.check + a.error) || b.total - a.total,
  );
  const totals = ranked.reduce(
    (sum, stat) => ({
      total: sum.total + stat.total,
      ok: sum.ok + stat.ok,
      check: sum.check + stat.check + stat.error,
    }),
    { total: 0, ok: 0, check: 0 },
  );

  return (
    <div className="progress-dashboard">
      <PageIntro
        title={copy.progress.title}
        lead={copy.progress.machineHint}
        aside={
          <Link
            href="/settings"
            className="progress-dashboard__settings"
            aria-label={copy.progress.openSettings}
          >
            <Icon name={IconName.Settings} />
          </Link>
        }
      />
      {status === AsyncStatus.Loading ? <Skeleton lines={5} /> : null}
      {status === AsyncStatus.Error ? <ErrorState message={error ?? ''} onRetry={reload} /> : null}
      {data ? (
        <>
          <div className="progress-dashboard__stats">
            <Stat label={copy.progress.statRuns} value={String(data.runs)} />
            <Stat
              label={copy.progress.statOk}
              value={totals.total ? formatPercent(totals.ok, totals.total) : '–'}
              tone="success"
            />
            <Stat label={copy.progress.statCheck} value={String(totals.check)} tone="warning" />
            <Stat label={copy.progress.statSounds} value={String(ranked.length)} />
          </div>

          <PlanCard headingId="week" showFocus={false} />

          <Tabs
            label={copy.progress.title}
            value={panel}
            options={[
              { id: 'sounds', label: copy.progress.perSound },
              { id: 'recent', label: copy.progress.recent },
            ]}
            onChange={setPanel}
          />

          {panel === 'sounds' ? (
            <Card as="section" aria-labelledby="per-sound" className="progress-dashboard__panel">
              <SectionHeader
                id="per-sound"
                title={`${copy.progress.perSound} · ${copy.progress.machine}`}
                hint={copy.progress.sortedHint}
              />
              {ranked.length === 0 ? (
                <EmptyState message={copy.progress.empty} />
              ) : (
                <div className="progress-dashboard__scroll">
                  <table className="progress-dashboard__table">
                    <thead>
                      <tr>
                        <th scope="col" className="progress-dashboard__head-cell">
                          {copy.progress.sound}
                        </th>
                        <th scope="col" className="progress-dashboard__head-cell">
                          {copy.progress.total}
                        </th>
                        <th scope="col" className="progress-dashboard__head-cell">
                          {copy.verdict.ok}
                        </th>
                        <th scope="col" className="progress-dashboard__head-cell">
                          {copy.verdict.check}
                        </th>
                        <th scope="col" className="progress-dashboard__head-cell">
                          {copy.verdict.error}
                        </th>
                        <th scope="col" className="progress-dashboard__head-cell">
                          {copy.progress.rate}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {ranked.map((stat) => (
                        <tr key={stat.phoneme}>
                          <th
                            scope="row"
                            className="progress-dashboard__ipa progress-dashboard__cell"
                          >
                            {drillIdOf(stat.phoneme) ? (
                              <Link
                                href={{
                                  pathname: '/practice',
                                  query: { sound: drillIdOf(stat.phoneme) },
                                }}
                                className="ipa-pill"
                              >
                                /{stat.ipa}/
                              </Link>
                            ) : (
                              <span className="ipa-pill">/{stat.ipa}/</span>
                            )}
                          </th>
                          <td className="progress-dashboard__cell">{stat.total}</td>
                          <td className="progress-dashboard__cell">{stat.ok}</td>
                          <td className="progress-dashboard__cell">{stat.check}</td>
                          <td className="progress-dashboard__cell">{stat.error}</td>
                          <td className="progress-dashboard__cell">
                            <span
                              className="progress-dashboard__bar"
                              role="img"
                              aria-label={copy.progress.okShare(formatPercent(stat.ok, stat.total))}
                            >
                              <span
                                className="progress-dashboard__bar-ok"
                                style={{ inlineSize: formatPercent(stat.ok, stat.total) }}
                              />
                              <span
                                className="progress-dashboard__bar-check"
                                style={{ inlineSize: formatPercent(stat.check, stat.total) }}
                              />
                            </span>
                            <span className="progress-dashboard__muted">
                              {formatPercent(stat.ok, stat.total)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          ) : (
            <Card as="section" aria-labelledby="recent" className="progress-dashboard__panel">
              <SectionHeader id="recent" title={copy.progress.recent} />
              {data.recent.length === 0 ? (
                <EmptyState message={copy.progress.empty} />
              ) : (
                <div className="progress-dashboard__runs">
                  {data.recent.map((run) => (
                    <ListRow
                      key={run.id}
                      title={run.text}
                      subtitle={`${formatDateTime(run.created_at)} · ${copy.practice.summary(run.ok, run.check, run.error)}${run.disputed ? ` · ${copy.progress.disputedBadge}` : ''}`}
                      trailing={copy.progress.view}
                      href={{ pathname: '/practice', query: { run: run.id } }}
                    />
                  ))}
                </div>
              )}
            </Card>
          )}
        </>
      ) : null}
    </div>
  );
};
