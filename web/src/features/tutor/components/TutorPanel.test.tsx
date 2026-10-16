import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { TutorPanel } from './TutorPanel';

describe('TutorPanel', () => {
  it('asks, shows loading, then renders the answer and model', async () => {
    const request = vi.fn(() => Promise.resolve({ text_vi: 'Bạn làm tốt.', model: 'kimi-k2.6' }));
    render(<TutorPanel title="Gia sư AI" buttonLabel="Giải thích bằng AI" request={request} />);
    await userEvent.click(screen.getByRole('button', { name: 'Giải thích bằng AI' }));
    await waitFor(() => expect(screen.getByText('Bạn làm tốt.')).toBeInTheDocument());
    expect(screen.getByText(/kimi-k2.6/)).toBeInTheDocument();
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('requires confirmation before sending when a confirm line is given', async () => {
    const request = vi.fn(() => Promise.resolve({ text_vi: 'Môi tròn.', model: 'm' }));
    render(
      <TutorPanel
        title="Khẩu hình"
        buttonLabel="Hỏi AI"
        request={request}
        confirmLine="Ảnh này sẽ được gửi tới Kimi"
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Hỏi AI' }));
    expect(screen.getByText('Ảnh này sẽ được gửi tới Kimi')).toBeInTheDocument();
    expect(request).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Hủy' }));
    expect(screen.queryByText('Ảnh này sẽ được gửi tới Kimi')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Hỏi AI' }));
    await userEvent.click(screen.getByRole('button', { name: 'Gửi ảnh' }));
    await waitFor(() => expect(screen.getByText('Môi tròn.')).toBeInTheDocument());
  });

  it('shows the provider error', async () => {
    const request = vi.fn(() => Promise.reject(new Error('Gia sư AI chưa bật')));
    render(<TutorPanel title="t" buttonLabel="Hỏi" request={request} />);
    await userEvent.click(screen.getByRole('button', { name: 'Hỏi' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Gia sư AI chưa bật'));
  });
});
