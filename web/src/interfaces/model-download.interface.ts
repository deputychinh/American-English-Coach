/** Where the one-time model download stands (shared by every screen that shows it). */
export interface ModelDownloadState {
  phase: 'unknown' | 'missing' | 'downloading' | 'ready' | 'error';
  /** 0–100 while downloading. */
  percent: number;
  error: string | null;
}
