'use client';

import type { ReactElement } from 'react';

import { useCopy } from '@/hooks/useCopy';
import type { FluencyPrompt, FluencySession } from '@/interfaces/fluency.interface';
import { formatDate } from '@/utils/format.util';

import './FluencyTrend.css';

interface FluencyTrendProps {
  sessions: FluencySession[];
  prompts: FluencyPrompt[];
}

/** The last round of each recent session: is the learner getting faster and more fluent? */
export const FluencyTrend = ({ sessions, prompts }: FluencyTrendProps): ReactElement => {
  const copy = useCopy().fluency;
  const titles = new Map(prompts.map((prompt) => [prompt.id, prompt.title_vi]));
  const lasts = sessions.flatMap((session) => {
    const last = session.rounds.at(-1);
    return last ? [{ session, metrics: last.metrics }] : [];
  });
  const fastest = Math.max(1, ...lasts.map(({ metrics }) => metrics.speechRate));
  return (
    <section className="fluency-trend" aria-labelledby="fluency-trend-title">
      <h2 id="fluency-trend-title" className="fluency-trend__title">
        {copy.trendTitle}
      </h2>
      {lasts.length === 0 ? (
        <p className="fluency-trend__note">{copy.trendEmpty}</p>
      ) : (
        <>
          <ol className="fluency-trend__list">
            {lasts.map(({ session, metrics }) => (
              <li key={session.id} className="fluency-trend__row">
                <span className="fluency-trend__label">
                  {copy.trendRow(
                    formatDate(session.createdAt),
                    titles.get(session.promptId) ?? session.promptId,
                  )}
                </span>
                <span className="fluency-trend__bar" aria-hidden="true">
                  <span
                    className="fluency-trend__fill"
                    style={{
                      inlineSize: `${String(Math.round((100 * metrics.speechRate) / fastest))}%`,
                    }}
                  />
                </span>
                <span className="fluency-trend__value">
                  {Math.round(metrics.speechRate)} {copy.rateUnit} · {metrics.meanLengthOfRun}{' '}
                  {copy.runUnit}
                </span>
              </li>
            ))}
          </ol>
          <p className="fluency-trend__note">{copy.trendNote}</p>
        </>
      )}
    </section>
  );
};
