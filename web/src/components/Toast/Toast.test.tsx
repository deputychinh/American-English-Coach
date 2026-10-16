import { act, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';

import { ToastProvider, useToast } from './Toast';

const Trigger = (): ReactElement => {
  const toast = useToast();
  return (
    <button type="button" onClick={() => toast.show('Đã lưu', 'success')}>
      go
    </button>
  );
};

describe('Toast', () => {
  it('shows a message, lets the user dismiss it, and auto-hides', () => {
    vi.useFakeTimers();
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    act(() => {
      screen.getByRole('button', { name: 'go' }).click();
    });
    expect(screen.getByRole('status')).toHaveTextContent('Đã lưu');
    act(() => {
      screen.getByRole('button', { name: 'Bỏ qua thông báo' }).click();
    });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    act(() => {
      screen.getByRole('button', { name: 'go' }).click();
    });
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    vi.useRealTimers();
  });
});
