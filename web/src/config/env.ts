// The only module that reads the environment (plan §6A.2 "Config").
export const env = {
  /** Same-origin in production (API serves the static export); `next dev` rewrites /api to the API. */
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? '',
  isProduction: process.env.NODE_ENV === 'production',
} as const;
