import type { NextConfig } from 'next';

// The app is a static export served next to the FastAPI backend (local-first, one machine).
// In development `next dev` proxies /api to the backend so browser calls stay same-origin.
const apiBaseUrl = process.env.API_BASE_URL ?? 'http://127.0.0.1:8765';
const isDevelopment = process.env.NODE_ENV === 'development';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  output: isDevelopment ? undefined : 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  typedRoutes: true,
  // Next 16 blocks dev resources (HMR, Suspense chunks) for origins other than localhost; the
  // Makefile and docs use 127.0.0.1, so allow it or client pages stay on their Suspense fallback.
  allowedDevOrigins: ['127.0.0.1'],
  ...(isDevelopment
    ? {
        rewrites: () =>
          Promise.resolve([
            { source: '/api/v1/:path*', destination: `${apiBaseUrl}/api/v1/:path*` },
          ]),
      }
    : {}),
  turbopack: { root: import.meta.dirname },
};

export default nextConfig;
