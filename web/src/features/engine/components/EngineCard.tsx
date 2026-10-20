'use client';

import { type ReactElement, useCallback, useState } from 'react';

import { Button } from '@/components/Button/Button';
import {
  ENGINE_BENCH_RUNS,
  ENGINE_BENCH_SECONDS,
  ENGINE_MODEL_MEGABYTES,
  ENGINE_MODEL_NAME,
  ENGINE_THREADS,
} from '@/constants/engine.constant';
import { ButtonVariant } from '@/enums/button-variant.enum';
import { StorageKey } from '@/enums/storage-key.enum';
import { modelSource, PhonemeEngine } from '@/features/engine/services/engine.service';
import { useAsync } from '@/hooks/useAsync';
import { useCopy } from '@/hooks/useCopy';
import { useStoredState } from '@/hooks/useStoredState';
import { writeStorage } from '@/utils/storage.util';

import './EngineCard.css';

const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
};

/**
 * Preview of on-device scoring (plan A0): download the model from the paired server, load it on
 * the CPU or the Neural Engine and time it. The plugin also prints `ENGINE_BENCH …` lines.
 */
export const EngineCard = (): ReactElement => {
  const copy = useCopy();
  const loadStatus = useCallback(async () => {
    const current = await PhonemeEngine.status({ name: ENGINE_MODEL_NAME });
    // Local mode switches on once the model is on the device (api-base.util isLocalMode).
    writeStorage(StorageKey.EngineReady, current.downloaded);
    return current;
  }, []);
  const engineStatus = useAsync(loadStatus);
  const status = engineStatus.data;
  const [percent, setPercent] = useState<number | null>(null);
  const [lines, setLines] = useState<string[]>([]);
  const [isBusy, setIsBusy] = useState(false);
  const [isPreferred, setIsPreferred] = useStoredState<boolean>(StorageKey.OnDeviceScoring, true);

  const report = (line: string): void => {
    setLines((previous) => [...previous, line]);
  };

  const run = async (task: () => Promise<void>): Promise<void> => {
    setIsBusy(true);
    try {
      await task();
    } catch (cause) {
      report(copy.engine.failed(cause instanceof Error ? cause.message : String(cause)));
    } finally {
      setIsBusy(false);
      setPercent(null);
      engineStatus.reload();
    }
  };

  const download = (): Promise<void> =>
    run(async () => {
      const source = await modelSource();
      if (!source) {
        report(copy.engine.noServer);
        return;
      }
      const listener = await PhonemeEngine.addListener('downloadProgress', (progress) =>
        setPercent(
          progress.expected > 0 ? Math.round((100 * progress.received) / progress.expected) : 0,
        ),
      );
      setPercent(0);
      try {
        await PhonemeEngine.download({
          url: source.url,
          name: ENGINE_MODEL_NAME,
          sha256: source.file.sha256,
          headers: source.headers,
        });
      } finally {
        await listener.remove();
      }
    });

  const benchmark = (coreML: boolean): Promise<void> =>
    run(async () => {
      const loaded = await PhonemeEngine.load({
        name: ENGINE_MODEL_NAME,
        coreML,
        threads: ENGINE_THREADS,
      });
      report(copy.engine.loaded(Math.round(loaded.milliseconds), loaded.coreML));
      const timing = await PhonemeEngine.benchmark({
        seconds: ENGINE_BENCH_SECONDS,
        runs: ENGINE_BENCH_RUNS,
      });
      report(
        copy.engine.result(
          ENGINE_BENCH_SECONDS,
          Math.round(median(timing.milliseconds)),
          Math.round(Math.min(...timing.milliseconds)),
        ),
      );
    });

  return (
    <div className="engine-card">
      <p className="engine-card__lead">{copy.engine.lead}</p>
      {status ? (
        <p className="engine-card__meta">
          {status.downloaded ? copy.engine.rowReady : copy.engine.rowMissing} ·{' '}
          {copy.engine.memory(Math.round(status.physicalMemory / 1e9))}
        </p>
      ) : null}
      <div className="engine-card__actions">
        {status?.downloaded ? (
          <>
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
          </>
        ) : (
          <Button isSmall disabled={isBusy} onClick={() => void download()}>
            {percent === null
              ? copy.engine.download(ENGINE_MODEL_MEGABYTES)
              : copy.engine.downloading(percent)}
          </Button>
        )}
        {percent !== null ? (
          <Button
            isSmall
            variant={ButtonVariant.Ghost}
            onClick={() => void PhonemeEngine.cancelDownload()}
          >
            {copy.engine.cancel}
          </Button>
        ) : null}
      </div>
      {status?.downloaded ? (
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
      ) : null}
      {isBusy && percent === null ? <p role="status">{copy.engine.working}</p> : null}
      {lines.length > 0 ? (
        <ul className="engine-card__log" aria-live="polite">
          {lines.map((line, index) => (
            <li key={`${String(index)}-${line}`}>{line}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
};
