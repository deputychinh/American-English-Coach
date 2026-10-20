import type { Copy } from '@/interfaces/copy.interface';

/** On-device scoring copy (split from `en.ts` to keep files short). */
export const enEngine: Pick<Copy, 'engine'> = {
  engine: {
    title: 'On-device scoring (preview)',
    lead: 'Download the scoring model to this iPhone so it can score without a computer. Preview: measures speed on this device.',
    rowReady: 'Downloaded',
    rowMissing: 'Not downloaded',
    download: (megabytes: number): string => `Download the model (${megabytes} MB)`,
    downloading: (percent: number): string => `Downloading… ${percent}%`,
    cancel: 'Cancel',
    load: 'Load the model',
    benchmarkCpu: 'Measure speed (CPU)',
    benchmarkCoreML: 'Measure speed (Neural Engine)',
    working: 'Measuring…',
    loaded: (milliseconds: number, coreML: boolean): string =>
      `Loaded in ${milliseconds} ms${coreML ? ' · Neural Engine' : ' · CPU'}`,
    result: (seconds: number, median: number, best: number): string =>
      `${seconds} s of audio: median ${median} ms, best ${best} ms`,
    noServer: 'Pair with a scoring server to download the preview.',
    failed: (reason: string): string => `Could not do that: ${reason}`,
    memory: (gigabytes: number): string => `Device RAM: ${gigabytes} GB`,
  },
};
