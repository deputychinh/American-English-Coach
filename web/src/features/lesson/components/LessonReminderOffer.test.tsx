import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { StorageKey } from '@/enums/storage-key.enum';

import { LessonReminderOffer } from './LessonReminderOffer';

const { native, schedule } = vi.hoisted(() => ({
  native: { value: true },
  schedule: vi.fn<() => Promise<string>>(),
}));
vi.mock('@/utils/api-base.util', () => ({ isNativeShell: () => native.value }));
vi.mock('@/utils/native.util', () => ({ nativeScheduleDailyReminder: schedule }));

describe('LessonReminderOffer', () => {
  beforeEach(() => {
    localStorage.clear();
    native.value = true;
  });

  it('turns the daily reminder on in one tap after a lesson', async () => {
    schedule.mockResolvedValue('scheduled');
    render(<LessonReminderOffer />);
    await userEvent.click(
      screen.getByRole('button', { name: 'Nhắc tôi luyện mỗi ngày lúc 19:30' }),
    );
    expect(screen.getByRole('status')).toHaveTextContent('Sẽ nhắc mỗi ngày lúc 19:30.');
    expect(localStorage.getItem(StorageKey.ReminderTime)).toContain('19:30');
  });

  it('explains a refused permission and stays away when a reminder is set or on the web', async () => {
    schedule.mockResolvedValue('denied');
    const { unmount } = render(<LessonReminderOffer />);
    await userEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('status')).toHaveTextContent('iOS chưa cho phép thông báo');
    unmount();
    localStorage.setItem(StorageKey.ReminderTime, JSON.stringify('20:00'));
    const second = render(<LessonReminderOffer />);
    expect(second.container).toBeEmptyDOMElement();
    second.unmount();
    localStorage.clear();
    native.value = false;
    expect(render(<LessonReminderOffer />).container).toBeEmptyDOMElement();
  });
});
