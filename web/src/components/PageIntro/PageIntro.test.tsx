import { act, render, screen } from '@testing-library/react';

import { PageIntro } from './PageIntro';

type Observed = (entries: Partial<IntersectionObserverEntry>[]) => void;

describe('PageIntro', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('shows the small title bar only once the large title has scrolled away', () => {
    let notify: Observed = () => undefined;
    const disconnect = vi.fn();
    vi.stubGlobal(
      'IntersectionObserver',
      vi.fn(function (this: IntersectionObserver, callback: Observed) {
        notify = callback;
        Object.assign(this, { observe: vi.fn(), disconnect });
      }),
    );
    const { container, unmount } = render(<PageIntro title="Tiến độ" lead="Theo từng âm." />);
    const bar = container.querySelector('.large-title-bar');
    expect(screen.getByRole('heading', { level: 1, name: 'Tiến độ' })).toBeVisible();
    expect(bar).toHaveAttribute('aria-hidden', 'true');
    expect(bar).not.toHaveClass('is-shown');

    act(() => notify([{ isIntersecting: false, boundingClientRect: { top: -40 } as DOMRect }]));
    expect(bar).toHaveClass('is-shown');
    act(() => notify([{ isIntersecting: true, boundingClientRect: { top: 120 } as DOMRect }]));
    expect(bar).not.toHaveClass('is-shown');

    unmount();
    expect(disconnect).toHaveBeenCalled();
  });

  it('keeps the large title without an observer (older browsers)', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    const { container } = render(<PageIntro title="Cài đặt" />);
    expect(container.querySelector('.large-title-bar')).not.toHaveClass('is-shown');
  });
});
