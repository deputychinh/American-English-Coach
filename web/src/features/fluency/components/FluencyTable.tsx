'use client';

import type { ReactElement } from 'react';

import { useCopy } from '@/hooks/useCopy';
import type { FluencyMetrics, FluencyRound } from '@/interfaces/fluency.interface';

import './FluencyTable.css';

interface FluencyTableProps {
  rounds: FluencyRound[];
}

/** The three measures of each round side by side (plan v2 §6: "ba chỉ số cạnh nhau"). */
export const FluencyTable = ({ rounds }: FluencyTableProps): ReactElement => {
  const copy = useCopy().fluency;
  const rows: { label: string; unit: string; value: (metrics: FluencyMetrics) => number }[] = [
    { label: copy.rate, unit: copy.rateUnit, value: (m) => Math.round(m.speechRate) },
    { label: copy.run, unit: copy.runUnit, value: (m) => m.meanLengthOfRun },
    { label: copy.pauses, unit: copy.pausesUnit, value: (m) => m.pausesPerMinute },
  ];
  return (
    <table className="fluency-table">
      <thead>
        <tr>
          <th scope="col" className="fluency-table__head fluency-table__head--label">
            {copy.metric}
          </th>
          {rounds.map((round, index) => (
            <th key={round.targetSeconds} scope="col" className="fluency-table__head">
              {copy.column(index + 1, round.targetSeconds)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.label}>
            <th scope="row" className="fluency-table__label">
              {row.label}
              <small className="fluency-table__unit">{row.unit}</small>
            </th>
            {rounds.map((round) => (
              <td key={round.targetSeconds} className="fluency-table__cell">
                {row.value(round.metrics)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};
