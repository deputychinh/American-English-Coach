import type { Copy } from '@/interfaces/copy.interface';

/** On-device scoring copy (split from `en.ts` to keep files short). */
export const enEngine: Pick<Copy, 'engine'> = {
  engine: {
    advancedGroup: 'Advanced',
    serverRow: 'Own scoring server (classroom, development)',
    packTitle: 'Download the scoring pack',
    packBody: (megabytes: number): string =>
      `${megabytes} MB, downloaded once; Wi-Fi recommended. Then the app scores on this device without a connection. Meanwhile you can listen, use the mirror and study.`,
    packInstallFirst:
      'On iPhone, add the app to the home screen and download from there. Safari may delete the pack of a site that is not installed after 7 days unused.',
    packStart: 'Download now',
    packProgress: (percent: number): string => `Downloading the scoring pack… ${percent}%`,
    packRetry: 'Try again',
    packFailed: (reason: string): string => `Not finished: ${reason}`,
    packReady: 'The scoring pack is ready on this device.',
    needModel: 'Download the scoring pack first (Home or Settings → On-device scoring).',
    advanced: 'Measure speed (for testing)',
    title: 'On-device scoring',
    lead: 'Pronunciation is scored on this device: your voice never leaves the device.',
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
    usePreference: 'Score on this device while practising',
    usePreferenceHint: 'Scores, keeps progress and plans on this device, no computer needed.',
    memory: (gigabytes: number): string => `Device RAM: ${gigabytes} GB`,
    webManifestFailed: (status: number): string =>
      `The scoring pack is not on the web server (HTTP ${status}).`,
    webPartFailed: (status: number): string => `A part of the pack failed (HTTP ${status}).`,
    webPartCorrupt: 'A part of the pack arrived damaged. Tap Try again to resume.',
    webNoOutput: 'The model returned nothing.',
    webCancelled: 'Cancelled. Next time the download resumes where it stopped.',
  },
};
