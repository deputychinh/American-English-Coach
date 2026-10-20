import type { PluginListenerHandle } from '@capacitor/core';

/** State of the on-device phoneme model (native `PhonemeEngine` plugin). */
export interface EngineStatus {
  downloaded: boolean;
  bytes: number;
  loaded: boolean;
  coreML: boolean;
  physicalMemory: number;
}

export interface EnginePosteriors {
  frames: number;
  vocab: number;
  /** Base64 Float32 log-softmax, frames × vocab, row-major. */
  data: string;
  milliseconds: number;
}

export interface EngineDownloadProgress {
  received: number;
  expected: number;
}

/** One file of `data/models/onnx/manifest.json`. */
export interface EngineModelFile {
  bytes: number;
  sha256: string;
}

export interface PhonemeEnginePlugin {
  status(options: { name: string }): Promise<EngineStatus>;
  download(options: {
    url: string;
    name: string;
    sha256: string;
    headers: Record<string, string>;
  }): Promise<{ path: string }>;
  cancelDownload(): Promise<void>;
  load(options: {
    name: string;
    coreML: boolean;
    threads: number;
  }): Promise<{ milliseconds: number; coreML: boolean }>;
  posteriors(options: { samples: string }): Promise<EnginePosteriors>;
  benchmark(options: {
    seconds: number;
    runs: number;
  }): Promise<{ milliseconds: number[]; coreML: boolean }>;
  addListener(
    event: 'downloadProgress',
    handler: (progress: EngineDownloadProgress) => void,
  ): Promise<PluginListenerHandle>;
}
