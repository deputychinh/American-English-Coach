import { render, screen } from '@testing-library/react';
import { act } from 'react';

import { ToastProvider } from '@/components/Toast/Toast';

import { AppShell } from './AppShell';

vi.mock('next/navigation', () => ({ usePathname: () => '/practice/' }));

describe('AppShell', () => {
  it('renders header nav, tab bar with the active tab, and the unauthorized banner on demand', () => {
    render(
      <ToastProvider>
        <AppShell>
          <p>Nội dung</p>
        </AppShell>
      </ToastProvider>,
    );
    const tabs = screen.getByRole('navigation', { name: 'Thanh điều hướng' });
    expect(tabs.querySelectorAll('a')).toHaveLength(5);
    expect(tabs.querySelector('a[aria-current="page"]')).toHaveTextContent('Luyện tập');
    expect(screen.getByRole('navigation', { name: 'Điều hướng chính' })).toBeInTheDocument();
    expect(screen.queryByText(/yêu cầu ghép nối/)).not.toBeInTheDocument();
    act(() => {
      window.dispatchEvent(new CustomEvent('coach:unauthorized'));
    });
    expect(screen.getByText(/yêu cầu ghép nối/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Mở cài đặt' })).toHaveAttribute(
      'href',
      '/settings#settings-pairing',
    );
  });

  it('toggles the theme from the header button', () => {
    document.documentElement.dataset.theme = 'light';
    render(
      <ToastProvider>
        <AppShell>
          <p>x</p>
        </AppShell>
      </ToastProvider>,
    );
    act(() => {
      screen.getByRole('button', { name: 'Đổi giao diện' }).click();
    });
    expect(document.documentElement.dataset.theme).toBe('dark');
    document.documentElement.dataset.theme = 'light';
  });
});
