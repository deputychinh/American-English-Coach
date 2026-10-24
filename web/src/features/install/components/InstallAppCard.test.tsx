import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { listenForInstallPrompt } from '@/features/install/services/install-prompt.service';

import { InstallAppCard } from './InstallAppCard';

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15';
const defaultAgent = navigator.userAgent;

const setUserAgent = (userAgent: string): void => {
  Object.defineProperty(navigator, 'userAgent', { configurable: true, value: userAgent });
};

/** Chromium's install prompt, as the browser fires it. */
const firePrompt = (outcome: 'accepted' | 'dismissed') => {
  const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
    prompt: vi.fn().mockResolvedValue(undefined),
    userChoice: Promise.resolve({ outcome }),
  });
  act(() => {
    window.dispatchEvent(event);
  });
  return event;
};

describe('InstallAppCard', () => {
  beforeAll(() => listenForInstallPrompt());

  afterEach(() => {
    setUserAgent(defaultAgent);
    localStorage.clear();
    act(() => {
      window.dispatchEvent(new Event('appinstalled'));
    });
  });

  it('stays hidden on a desktop browser without an install prompt', () => {
    const { container } = render(<InstallAppCard />);
    expect(container).toBeEmptyDOMElement();
  });

  it("offers the browser's own install dialog and hides once it was used", async () => {
    render(<InstallAppCard />);
    const event = firePrompt('accepted');
    expect(event.defaultPrevented).toBe(true);
    await userEvent.click(screen.getByRole('button', { name: 'Cài đặt' }));
    expect(event.prompt).toHaveBeenCalledOnce();
    expect(screen.queryByRole('heading', { name: 'Cài app lên màn hình chính' })).toBeNull();
  });

  it('walks an iPhone through the Share menu and remembers "Not now"', async () => {
    setUserAgent(IPHONE);
    const { unmount } = render(<InstallAppCard />);
    expect(screen.getByRole('heading', { name: 'Cài app lên màn hình chính' })).toBeVisible();
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByText(/Thêm vào MH chính/)).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Cài đặt' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Để sau' }));
    expect(screen.queryByRole('heading', { name: 'Cài app lên màn hình chính' })).toBeNull();
    unmount();
    const { container } = render(<InstallAppCard />);
    expect(container).toBeEmptyDOMElement();
  });

  it('hides when the app already runs from the home screen', () => {
    setUserAgent(IPHONE);
    Object.defineProperty(navigator, 'standalone', { configurable: true, value: true });
    const { container } = render(<InstallAppCard />);
    expect(container).toBeEmptyDOMElement();
    Object.defineProperty(navigator, 'standalone', { configurable: true, value: undefined });
  });
});
