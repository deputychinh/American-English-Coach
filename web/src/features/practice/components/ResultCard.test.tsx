import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { jsonResponse, mockApi } from '@/test-utils/api-mock';
import { assessmentFixture } from '@/test-utils/assessment.fixture';

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

  it('sends a dispute and thanks the learner', async () => {
    const fetchMock = mockApi({
      '/api/v1/runs/run-1/dispute': () => new Response(null, { status: 204 }),
    });
    const user = userEvent.setup();
    render(<ResultCard result={assessmentFixture()} recording={null} outlineAt={() => []} />);
    await user.click(screen.getByRole('button', { name: 'Tôi nói đúng mà' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Đã ghi nhận'));
    expect(fetchMock).toHaveBeenCalledTimes(1);
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
