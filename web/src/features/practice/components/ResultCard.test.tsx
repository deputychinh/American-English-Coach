import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { jsonResponse, mockApi } from '@/test-utils/api-mock';
import { assessmentFixture, phone } from '@/test-utils/assessment.fixture';

import { ResultCard } from './ResultCard';

describe('ResultCard', () => {
  it('shows counts, one chip per phone with a textual verdict, and the focus list', () => {
    render(<ResultCard result={assessmentFixture()} recording={null} outlineAt={() => []} />);
    expect(screen.getByText(/2 âm đạt · 1 âm cần nghe lại · 1 âm sai/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '/θ/ nghe lại' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '/k/ sai' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /đạt$/ })).toHaveLength(2);
    expect(screen.getByText('Ưu tiên luyện tiếp')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Luyện ngay' })).toHaveAttribute(
      'href',
      expect.stringContaining('/mirror?sound=TH'),
    );
    expect(screen.getByText(/Gợi ý ngữ điệu/)).toBeInTheDocument();
  });

  it('opens the phone detail with the hint, the heard sound and the mouth replay', async () => {
    const user = userEvent.setup();
    render(<ResultCard result={assessmentFixture()} recording={null} outlineAt={() => []} />);
    await user.click(screen.getByRole('button', { name: '/θ/ nghe lại' }));
    const detail = within(screen.getByRole('region', { name: 'Âm /θ/' }));
    expect(detail.getByText('Đặt đầu lưỡi giữa hai hàm răng.')).toBeInTheDocument();
    expect(detail.getByText('Đầu lưỡi lộ ra giữa răng.')).toBeInTheDocument();
    expect(detail.getByText('nghe thành /t/')).toBeInTheDocument();
    expect(detail.getByText('Bật camera để xem khẩu hình.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '/k/ sai' }));
    expect(screen.getByText('bị bỏ')).toBeInTheDocument();
    expect(screen.getByText('Camera không nhìn thấy âm này; dựa vào tai.')).toBeInTheDocument();
  });

  it('opens a sentence on its first word to fix, and a tap on a word shows its sounds', async () => {
    const user = userEvent.setup();
    const think = assessmentFixture().words[0];
    if (!think) throw new Error('fixture has a word');
    const fine = {
      ...think,
      word: 'I',
      ipa: 'aɪ',
      phones: [phone({ symbol: 'AY', ipa: 'aɪ', heard: 'AY', heard_ipa: 'aɪ' })],
    };
    render(
      <ResultCard
        result={{ ...assessmentFixture(), text: 'I think', words: [fine, think] }}
        recording={null}
        outlineAt={() => []}
      />,
    );
    expect(screen.getByText('Gần được rồi')).toBeVisible();
    const words = within(screen.getByRole('group', { name: 'Các từ bạn vừa nói' }));
    expect(words.getByRole('button', { name: 'I: đạt' })).toHaveAttribute('aria-pressed', 'false');
    expect(words.getByRole('button', { name: 'think: sai' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    // The weakest sound of the open word is already explained, mouth included.
    expect(screen.getByRole('region', { name: 'Âm /k/' })).toBeVisible();
    await user.click(words.getByRole('button', { name: 'I: đạt' }));
    expect(screen.getByRole('button', { name: '/aɪ/ đạt' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.queryByRole('button', { name: '/k/ sai' })).toBeNull();
    expect(screen.getByRole('region', { name: 'Âm /aɪ/' })).toBeVisible();
  });

  it('sends a dispute and thanks the learner', async () => {
    const fetchMock = mockApi({
      '/api/v1/runs/run-1/dispute': () => new Response(null, { status: 204 }),
    });
    const user = userEvent.setup();
    render(<ResultCard result={assessmentFixture()} recording={null} outlineAt={() => []} />);
    await user.click(screen.getByRole('button', { name: 'Tôi nói đúng mà' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Đã ghi nhận'));
    const urls = fetchMock.mock.calls.map((call: unknown[]) =>
      String(call[0] instanceof Request ? call[0].url : call[0]),
    );
    expect(urls.filter((url) => url.includes('/dispute'))).toHaveLength(1);
  });

  it('shows the dispute error when the API refuses', async () => {
    mockApi({
      '/api/v1/runs/run-1/dispute': () =>
        jsonResponse({ detail: 'run run-1 not found', code: 'NOT_FOUND' }, 404),
    });
    const user = userEvent.setup();
    render(<ResultCard result={assessmentFixture()} recording={null} outlineAt={() => []} />);
    await user.click(screen.getByRole('button', { name: 'Tôi nói đúng mà' }));
    await waitFor(() => expect(screen.getByText('run run-1 not found')).toBeInTheDocument());
  });
});
