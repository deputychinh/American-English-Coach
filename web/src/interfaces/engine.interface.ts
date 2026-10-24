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

/** One slice of the model as the web app hosts it (static hosts cap the size of a file). */
export interface WebModelPart {
  file: string;
  bytes: number;
  sha256: string;
}

/** `models/w2v.mm8/manifest.json`, written by scripts/stage-web-model.mjs. */
export interface WebModelManifest {
  name: string;
  bytes: number;
  sha256: string;
  parts: WebModelPart[];
}

/** The parts of a model kept in Cache Storage, as the browser engine's worker reads them. */
export interface WebModelSource {
  cacheName: string;
  urls: string[];
  bytes: number;
}

/** What the browser engine asks its worker to do. */
export type EngineWorkerCall =
  | { type: 'load'; source: WebModelSource; threads: number; wasmPaths: string }
  | { type: 'run'; samples: Float32Array };

export type EngineWorkerRequest = EngineWorkerCall & { id: number };

export interface EngineWorkerResponse {
  id: number;
  error: string | null;
  milliseconds: number;
  posteriors: { frames: number; vocab: number; data: Float32Array } | null;
}

export interface WebModelDownload {
  onProgress: (progress: EngineDownloadProgress) => void;
  signal: AbortSignal;
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
