'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  type ReactElement,
  type ReactNode,
  useEffect,
  useState,
  useSyncExternalStore,
} from 'react';

import { Icon } from '@/components/Icon/Icon';
import { IconButton } from '@/components/IconButton/IconButton';
import { UNAUTHORIZED_EVENT } from '@/constants/api.constant';
import { NAV_ITEMS } from '@/constants/navigation.constant';
import { IconName } from '@/enums/icon-name.enum';
import { StorageKey } from '@/enums/storage-key.enum';
import { Theme } from '@/enums/theme.enum';
import { useCopy } from '@/hooks/useCopy';
import { useIsImmersive } from '@/hooks/useImmersive';
import { cx } from '@/utils/cx.util';
import { nativeConfigureChrome } from '@/utils/native.util';
import { writeStorage } from '@/utils/storage.util';

import './AppShell.css';

const subscribeTheme = (listener: () => void): (() => void) => {
  const observer = new MutationObserver(listener);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => observer.disconnect();
};

const readTheme = (): Theme =>
  document.documentElement.dataset.theme === Theme.Dark ? Theme.Dark : Theme.Light;

const isActive = (pathname: string, href: string): boolean =>
  href === '/' ? pathname === '/' : pathname.startsWith(href);

interface AppShellProps {
  children: ReactNode;
}

/**
 * Header with the brand and desktop navigation, a five-tab bar on small screens and inside the
 * native shell, safe-area aware. Also keeps the native status bar in step with the theme.
 */
export const AppShell = ({ children }: AppShellProps): ReactElement => {
  const copy = useCopy();
  const pathname = usePathname();
  const theme = useSyncExternalStore(subscribeTheme, readTheme, () => Theme.Light);
  const isImmersive = useIsImmersive();

  useEffect(() => {
    void nativeConfigureChrome(theme === Theme.Dark);
  }, [theme]);

  const [isUnauthorized, setIsUnauthorized] = useState(false);
  useEffect(() => {
    const show = (): void => setIsUnauthorized(true);
    window.addEventListener(UNAUTHORIZED_EVENT, show);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, show);
  }, []);

  const toggleTheme = (): void => {
    const next = theme === Theme.Dark ? Theme.Light : Theme.Dark;
    document.documentElement.dataset.theme = next;
    writeStorage(StorageKey.Theme, next);
  };

  const labels: Record<string, string> = {
    home: copy.nav.home,
    practice: copy.nav.practice,
    sounds: copy.nav.sounds,
    mirror: copy.nav.mirror,
    progress: copy.nav.progress,
  };

  return (
    <div className={cx('app-shell', isImmersive && 'app-shell--immersive')}>
      <a className="skip-link" href="#main">
        {copy.skipToContent}
      </a>
      <header className="app-shell__header">
        <div className="app-shell__header-inner container">
          <Link href="/" className="app-shell__brand">
            <span className="app-shell__logo" aria-hidden="true">
              θ
            </span>
            <span className="app-shell__brand-name">{copy.appName}</span>
          </Link>
          <nav className="app-shell__nav" aria-label={copy.nav.ariaMain}>
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className={cx('app-shell__link', isActive(pathname, item.href) && 'is-active')}
                aria-current={isActive(pathname, item.href) ? 'page' : undefined}
              >
                <Icon name={item.icon} />
                <span>{labels[item.key]}</span>
              </Link>
            ))}
          </nav>
          <div className="app-shell__actions">
            <IconButton
              icon={theme === Theme.Dark ? IconName.Sun : IconName.Moon}
              label={copy.theme.toggle}
              aria-pressed={theme === Theme.Dark}
              isOnBrand
              onClick={toggleTheme}
            />
            <Link
              href="/settings"
              className={cx('app-shell__settings', isActive(pathname, '/settings') && 'is-active')}
              aria-label={copy.nav.settings}
              title={copy.nav.settings}
            >
              <Icon name={IconName.Settings} />
            </Link>
          </div>
        </div>
      </header>
      {isUnauthorized && !pathname.startsWith('/settings') ? (
        <div className="app-shell__banner container" role="status">
          <Icon name={IconName.Alert} />
          <span>{copy.unauthorized.message}</span>
          <Link
            href="/settings#settings-pairing"
            className="button button--secondary button--small"
          >
            {copy.unauthorized.action}
          </Link>
          <button
            type="button"
            className="app-shell__banner-close"
            aria-label={copy.common.dismiss}
            onClick={() => setIsUnauthorized(false)}
          >
            <Icon name={IconName.Close} />
          </button>
        </div>
      ) : null}
      <main id="main" className="app-shell__main container" tabIndex={-1}>
        {children}
      </main>
      <footer className="app-shell__footer container">
        <p>
          {copy.home.privacy} <Link href="/privacy">{copy.home.privacyLink}</Link>
        </p>
      </footer>
      <nav className="app-shell__tabbar" aria-label={copy.nav.ariaTabs}>
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className={cx('app-shell__tab', isActive(pathname, item.href) && 'is-active')}
            aria-current={isActive(pathname, item.href) ? 'page' : undefined}
          >
            <Icon name={item.icon} className="app-shell__tab-icon" />
            <span className="app-shell__tab-label">{copy.nav.tabLabels[item.key]}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
};
