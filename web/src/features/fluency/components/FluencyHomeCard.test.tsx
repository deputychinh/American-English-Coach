import { render, screen } from '@testing-library/react';

import { FluencyHomeCard } from './FluencyHomeCard';

describe('FluencyHomeCard', () => {
  beforeEach(() => localStorage.clear());

  it('links to three rounds on the topic of the placed unit', async () => {
    localStorage.setItem('coach.placement', JSON.stringify({ unitId: 'u07', level: 2 }));
    render(<FluencyHomeCard />);
    const link = await screen.findByRole('link', { name: /Nói 3 lần: Rủ bạn đi cuối tuần/ });
    expect(link).toHaveAttribute('href', '/fluency?unit=u07');
  });

  it('starts with the first topic before any placement', async () => {
    render(<FluencyHomeCard />);
    expect(
      await screen.findByRole('link', { name: /Nói 3 lần: Giới thiệu bản thân/ }),
    ).toHaveAttribute('href', '/fluency?unit=u01');
  });
});
