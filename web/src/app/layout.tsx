import '@/styles/index.css';

import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import type { ReactElement, ReactNode } from 'react';

import { AppHeader } from '@/components/AppHeader/AppHeader';
import { RegisterServiceWorker } from '@/components/RegisterServiceWorker/RegisterServiceWorker';
import { COPY } from '@/constants/copy.constant';

export const metadata: Metadata = {
  title: { default: COPY.appName, template: `%s · ${COPY.appName}` },
  description: COPY.tagline,
  manifest: '/manifest.webmanifest',
  icons: { icon: '/icons/icon.svg', apple: '/icons/icon-192.png' },
  appleWebApp: { capable: true, title: COPY.appName, statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  themeColor: '#c2410c',
  width: 'device-width',
  initialScale: 1,
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
      <a className="skip-link" href="#main">
        {COPY.skipToContent}
      </a>
      <AppHeader />
      <main id="main" className="container page" tabIndex={-1}>
        {children}
      </main>
      <footer className="container page-footer">
        <p>{COPY.home.privacy}</p>
      </footer>
      <RegisterServiceWorker />
    </body>
  </html>
);

export default RootLayout;
