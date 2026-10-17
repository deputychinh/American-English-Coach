import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ToastProvider } from '@/components/Toast/Toast';
import { StorageKey } from '@/enums/storage-key.enum';

import { GoalCard } from './GoalCard';

describe('GoalCard', () => {
  afterEach(() => localStorage.clear());

  it('stores the daily goal and explains that reminders need the iOS app', async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <GoalCard />
      </ToastProvider>,
    );
    expect(screen.getByRole('tab', { name: '3 lần' })).toHaveAttribute('aria-selected', 'true');
    await user.click(screen.getByRole('tab', { name: '5 lần' }));
    expect(JSON.parse(localStorage.getItem(StorageKey.DailyGoal) ?? '0')).toBe(5);
    expect(screen.getByRole('button', { name: 'Bật nhắc luyện' })).toBeDisabled();
    expect(screen.getByText(/có trong ứng dụng iOS/)).toBeInTheDocument();
  });
});
