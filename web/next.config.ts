import type { NextConfig } from 'next';

// The app is a static export served next to the FastAPI backend (local-first, one machine).
// In development `next dev` proxies /api to the backend so browser calls stay same-origin.
const apiBaseUrl = process.env.API_BASE_URL ?? 'http://127.0.0.1:8765';
const isDevelopment = process.env.NODE_ENV === 'development';
// The web app for static hosting (`make build-webapp`) exports to its own folder, so building it
// never replaces the export the API serves from web/out.
const isStandaloneWeb = process.env.NEXT_PUBLIC_STANDALONE_WEB === '1';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  output: isDevelopment ? undefined : 'export',
  ...(isStandaloneWeb && !isDevelopment ? { distDir: 'out-webapp' } : {}),
  trailingSlash: true,
  images: { unoptimized: true },
  typedRoutes: true,
  // The CSS is a few KB: inlining removes six render-blocking requests on first paint (Lighthouse).
  experimental: { inlineCss: true },
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
