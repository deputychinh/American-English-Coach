'use client';

import { type ReactElement, useState } from 'react';

import { Button } from '@/components/Button/Button';
import {
  ENGINE_BENCH_RUNS,
  ENGINE_BENCH_SECONDS,
  ENGINE_MODEL_NAME,
  ENGINE_THREADS,
} from '@/constants/engine.constant';
import { ButtonVariant } from '@/enums/button-variant.enum';
import { StorageKey } from '@/enums/storage-key.enum';
import { ModelDownloadCard } from '@/features/engine/components/ModelDownloadCard';
import { useModelDownload } from '@/features/engine/hooks/useModelDownload';
import { PhonemeEngine } from '@/features/engine/services/engine.service';
import { useCopy } from '@/hooks/useCopy';
import { useStoredState } from '@/hooks/useStoredState';

import './EngineCard.css';

const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
};

/**
 * Settings → On-device scoring: the scoring pack, the switch between the device and a scoring
 * server, and a speed check for testers (the plugin also prints `ENGINE_BENCH …` lines).
 */
export const EngineCard = (): ReactElement => {
  const copy = useCopy();
  const download = useModelDownload();
  const [lines, setLines] = useState<string[]>([]);
  const [isBusy, setIsBusy] = useState(false);
  const [isPreferred, setIsPreferred] = useStoredState<boolean>(StorageKey.OnDeviceScoring, true);

  const benchmark = async (coreML: boolean): Promise<void> => {
    setIsBusy(true);
    try {
      const loaded = await PhonemeEngine.load({
        name: ENGINE_MODEL_NAME,
        coreML,
        threads: ENGINE_THREADS,
      });
      const timing = await PhonemeEngine.benchmark({
        seconds: ENGINE_BENCH_SECONDS,
        runs: ENGINE_BENCH_RUNS,
      });
      setLines((previous) => [
        ...previous,
        copy.engine.loaded(Math.round(loaded.milliseconds), loaded.coreML),
        copy.engine.result(
          ENGINE_BENCH_SECONDS,
          Math.round(median(timing.milliseconds)),
          Math.round(Math.min(...timing.milliseconds)),
        ),
      ]);
    } catch (cause) {
      setLines((previous) => [
        ...previous,
        copy.engine.failed(cause instanceof Error ? cause.message : String(cause)),
      ]);
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="engine-card">
      <p className="engine-card__lead">{copy.engine.lead}</p>
      <ModelDownloadCard isReadyShown />
      {download.phase === 'ready' ? (
        <>
          <label className="engine-card__toggle">
            <input
              type="checkbox"
              checked={isPreferred}
              onChange={(event) => setIsPreferred(event.target.checked)}
            />
            <span className="engine-card__toggle-text">
              {copy.engine.usePreference}
              <small className="engine-card__meta">{copy.engine.usePreferenceHint}</small>
            </span>
          </label>
          <details className="engine-card__advanced">
            <summary>{copy.engine.advanced}</summary>
            <div className="engine-card__actions">
              <Button isSmall disabled={isBusy} onClick={() => void benchmark(false)}>
                {copy.engine.benchmarkCpu}
              </Button>
              <Button
                isSmall
                variant={ButtonVariant.Secondary}
                disabled={isBusy}
                onClick={() => void benchmark(true)}
              >
                {copy.engine.benchmarkCoreML}
              </Button>
            </div>
            {isBusy ? <p role="status">{copy.engine.working}</p> : null}
            {lines.length > 0 ? (
              <ul className="engine-card__log" aria-live="polite">
                {lines.map((line, index) => (
                  <li key={`${String(index)}-${line}`}>{line}</li>
                ))}
              </ul>
            ) : null}
          </details>
        </>
      ) : null}
    </div>
  );
};
