'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactElement } from 'react';

import { ThemeToggle } from '@/components/ThemeToggle/ThemeToggle';
import { COPY } from '@/constants/copy.constant';
import { cx } from '@/utils/cx.util';

import './AppHeader.css';

const LINKS = [
  { href: '/', label: COPY.nav.home },
  { href: '/practice', label: COPY.nav.practice },
  { href: '/sounds', label: COPY.nav.sounds },
  { href: '/mirror', label: COPY.nav.mirror },
  { href: '/progress', label: COPY.nav.progress },
] as const;

const isActive = (pathname: string, href: string): boolean =>
  href === '/' ? pathname === '/' : pathname.startsWith(href);

export const AppHeader = (): ReactElement => {
  const pathname = usePathname();
  return (
    <header className="app-header">
      <div className="app-header__inner container">
        <Link href="/" className="app-header__brand">
          <span className="app-header__logo" aria-hidden="true">
            θ
          </span>
          <span>{COPY.appName}</span>
        </Link>
        <nav className="app-header__nav" aria-label="Điều hướng chính">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cx('app-header__link', isActive(pathname, link.href) && 'is-active')}
              aria-current={isActive(pathname, link.href) ? 'page' : undefined}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <ThemeToggle />
      </div>
    </header>
  );
};
