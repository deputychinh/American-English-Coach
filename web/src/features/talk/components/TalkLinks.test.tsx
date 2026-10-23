import { render, screen } from '@testing-library/react';

import { resetRunsStore } from '@/utils/local-store.util';

import { TalkHomeCard } from './TalkHomeCard';
import { UnitTalkLinks } from './UnitTalkLinks';

describe('talk entry points', () => {
  beforeEach(() => {
    localStorage.clear();
    resetRunsStore();
  });

  it('shows what is waiting on the home screen', async () => {
    render(<TalkHomeCard />);
    const link = await screen.findByRole('link', { name: /Luyện cách nói/ });
    expect(link).toHaveAttribute('href', '/talk');
    expect(link).toHaveTextContent('10 thẻ mới hôm nay');
  });

  it("names a unit's phrases and pattern and links to them", async () => {
    render(<UnitTalkLinks unitId="u06" />);
    expect(await screen.findByText('Cụm giao tiếp: Phàn nàn nhẹ nhàng')).toBeInTheDocument();
    expect(screen.getByText('Mẫu câu: Hiện tại đơn ngôi ba: động từ thêm -s')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Luyện cách nói của đơn vị này' })).toHaveAttribute(
      'href',
      '/talk?unit=u06',
    );
  });

  it('shows nothing for a unit without talk content', async () => {
    const { container } = render(<UnitTalkLinks unitId="u99" />);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(container).toBeEmptyDOMElement();
  });
});
