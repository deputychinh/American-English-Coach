import '@/styles/index.css';

import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import type { ReactElement, ReactNode } from 'react';

import { AppErrorBoundary } from '@/components/AppErrorBoundary/AppErrorBoundary';
import { AppShell } from '@/components/AppShell/AppShell';
import { RegisterServiceWorker } from '@/components/RegisterServiceWorker/RegisterServiceWorker';
import { ToastProvider } from '@/components/Toast/Toast';
import { COPY } from '@/constants/copy.constant';

export const metadata: Metadata = {
  title: { default: COPY.appName, template: `%s · ${COPY.appName}` },
  description: COPY.tagline,
  manifest: '/manifest.webmanifest',
  icons: { icon: '/icons/icon.svg', apple: '/icons/icon-192.png' },
  appleWebApp: { capable: true, title: COPY.appName, statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#c2410c' },
    { media: '(prefers-color-scheme: dark)', color: '#1c1917' },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

interface RootLayoutProps {
  children: ReactNode;
}

const RootLayout = ({ children }: RootLayoutProps): ReactElement => (
  <html lang="vi" suppressHydrationWarning>
    <head>
      {/* Applies the saved theme before paint; a static file keeps CSP simple (no inline script). */}
      <Script src="/theme.js" strategy="beforeInteractive" />
    </head>
    <body>
      <AppErrorBoundary>
        <ToastProvider>
          <AppShell>{children}</AppShell>
        </ToastProvider>
      </AppErrorBoundary>
      <RegisterServiceWorker />
    </body>
  </html>
);

export default RootLayout;
