// The only module that reads the environment (plan §6A.2 "Config").
export const env = {
  /** Same-origin in production (API serves the static export); `next dev` rewrites /api to the API. */
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? '',
  /** Default scoring-server address baked into an iOS build for a real iPhone (`make ios-device`). */
  nativeApiBaseUrl: process.env.NEXT_PUBLIC_NATIVE_API_BASE_URL ?? '',
  isProduction: process.env.NODE_ENV === 'production',
  /**
   * The web app built for a static host with no scoring server (`make build-webapp`): like the
   * iOS app it answers its own API and scores in the browser once the model is downloaded.
   */
  isStandaloneWeb: process.env.NEXT_PUBLIC_STANDALONE_WEB === '1',
  /** Folder holding `manifest.json` and the model parts; same-origin unless a CDN is set. */
  engineModelBaseUrl: process.env.NEXT_PUBLIC_ENGINE_MODEL_BASE_URL ?? '/models/w2v.mm8/',
} as const;
