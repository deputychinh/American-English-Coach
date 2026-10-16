'use client';

import Link from 'next/link';
import type { ReactElement } from 'react';

import { EmptyState } from '@/components/EmptyState/EmptyState';
import { ErrorState } from '@/components/ErrorState/ErrorState';
import { PageIntro } from '@/components/PageIntro/PageIntro';
import { Skeleton } from '@/components/Skeleton/Skeleton';
import { COPY } from '@/constants/copy.constant';
import { AsyncStatus } from '@/enums/async-status.enum';
import { SettingsPanel } from '@/features/progress/components/SettingsPanel';
import { getProgress } from '@/features/progress/services/progress.service';
import { useAsync } from '@/hooks/useAsync';
import { formatDateTime, formatPercent } from '@/utils/format.util';

import './ProgressDashboard.css';

export const ProgressDashboard = (): ReactElement => {
  const { status, data, error, reload } = useAsync(getProgress);
  return (
    <div className="progress-dashboard">
      <PageIntro title={COPY.progress.title} lead={COPY.progress.machineHint} />
      {status === AsyncStatus.Loading ? <Skeleton lines={5} /> : null}
      {status === AsyncStatus.Error ? <ErrorState message={error ?? ''} onRetry={reload} /> : null}
      {data ? (
        <>
          <section className="progress-dashboard__panel" aria-labelledby="per-sound">
            <h2 id="per-sound" className="progress-dashboard__heading">
              {COPY.progress.perSound} · {COPY.progress.machine}
            </h2>
            {data.phonemes.length === 0 ? (
              <EmptyState message={COPY.progress.empty} />
            ) : (
              <table className="progress-dashboard__table">
                <thead>
                  <tr>
                    <th scope="col">Âm</th>
                    <th scope="col">{COPY.progress.total}</th>
                    <th scope="col">{COPY.verdict.ok}</th>
                    <th scope="col">{COPY.verdict.check}</th>
                    <th scope="col">{COPY.verdict.error}</th>
                    <th scope="col">Tỷ lệ</th>
                  </tr>
                </thead>
                <tbody>
                  {data.phonemes.map((stat) => (
                    <tr key={stat.phoneme}>
                      <th scope="row" className="progress-dashboard__ipa">
                        /{stat.ipa}/
                      </th>
                      <td>{stat.total}</td>
                      <td>{stat.ok}</td>
                      <td>{stat.check}</td>
                      <td>{stat.error}</td>
                      <td>
                        <span
                          className="progress-dashboard__bar"
                          role="img"
                          aria-label={`${formatPercent(stat.ok, stat.total)} đạt`}
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
            )}
          </section>
          <section className="progress-dashboard__panel" aria-labelledby="recent">
            <h2 id="recent" className="progress-dashboard__heading">
              {COPY.progress.recent}
            </h2>
            {data.recent.length === 0 ? (
              <EmptyState message={COPY.progress.empty} />
            ) : (
              <ul className="progress-dashboard__runs">
                {data.recent.map((run) => (
                  <li key={run.id} className="progress-dashboard__run">
                    <span className="progress-dashboard__run-text">{run.text}</span>
                    <span className="progress-dashboard__muted">
                      {formatDateTime(run.created_at)} ·{' '}
                      {COPY.practice.summary(run.ok, run.check, run.error)}
                      {run.disputed ? ` · ${COPY.progress.disputedBadge}` : ''}
                    </span>
                    <Link href={{ pathname: '/practice', query: { run: run.id } }}>
                      {COPY.progress.view}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}
      <SettingsPanel />
    </div>
  );
};
