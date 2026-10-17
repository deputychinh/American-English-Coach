// The only module that reads the environment (plan §6A.2 "Config").
export const env = {
  /** Same-origin in production (API serves the static export); `next dev` rewrites /api to the API. */
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? '',
  /** Default scoring-server address baked into an iOS build for a real iPhone (`make ios-device`). */
  nativeApiBaseUrl: process.env.NEXT_PUBLIC_NATIVE_API_BASE_URL ?? '',
  isProduction: process.env.NODE_ENV === 'production',
} as const;
