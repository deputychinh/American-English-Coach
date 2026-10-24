import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { TodayStatus } from '@/enums/today-status.enum';
import type { TodayInput, TodayState } from '@/interfaces/today.interface';
import { planToday } from '@/utils/today.util';

import { TodayHomeCard } from './TodayHomeCard';
import { TodayScreen } from './TodayScreen';

const { service } = vi.hoisted(() => ({
  service: { loadToday: vi.fn(), startUnitStep: vi.fn() },
}));
vi.mock('@/features/today/services/today.service', () => service);

const state = (over: Partial<TodayInput> = {}): TodayState => {
  const input: TodayInput = {
    vocabLeft: 0,
    talkLeft: 4,
    unit: { id: 'u03', title: 'Âm /θ/ và /ð/', steps: 5 },
    unitStep: 1,
    record: null,
    spokeToday: false,
    topic: 'Gia đình bạn',
    ...over,
  };
  return { ...planToday(input), input };
};

describe('TodayScreen', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lists the four parts with their status and continues with the next one', async () => {
    service.loadToday.mockResolvedValue(state());
    render(<TodayScreen />);
    expect(await screen.findByText('1/4 phần')).toBeVisible();
    const vocab = screen.getByRole('link', { name: /Ôn từ vựng.*Không còn thẻ nào hôm nay.*Xong/ });
    expect(vocab).toHaveAttribute('href', '/vocab?from=today');
    expect(
      screen.getByRole('link', { name: /Luyện cách nói.*4 thẻ hôm nay.*Tiếp theo/ }),
    ).toBeVisible();
    expect(screen.getByRole('link', { name: /Nói 3 lần.*Chủ đề: Gia đình bạn/ })).toHaveAttribute(
      'href',
      '/fluency?unit=u03&from=today',
    );
    expect(screen.getByRole('link', { name: 'Tiếp tục: Luyện cách nói' })).toHaveAttribute(
      'href',
      '/talk?from=today',
    );
  });

  it('remembers where the lesson stood before sending the learner to it', async () => {
    service.loadToday.mockResolvedValue(state({ talkLeft: 0 }));
    render(<TodayScreen />);
    const next = await screen.findByRole('link', { name: 'Tiếp tục: Bước tiếp của đơn vị' });
    expect(next).toHaveAttribute('href', '/lesson?unit=u03&from=today');
    next.addEventListener('click', (event) => event.preventDefault());
    await userEvent.click(next);
    expect(service.startUnitStep).toHaveBeenCalledWith('u03');
  });

  it('says the session is done when every part is', async () => {
    const done = state({ talkLeft: 0, unit: null, spokeToday: true });
    expect(done.steps.every((step) => step.status === TodayStatus.Done)).toBe(true);
    service.loadToday.mockResolvedValue(done);
    render(<TodayScreen />);
    expect(await screen.findByText('Xong phiên hôm nay. Mai gặp lại nhé!')).toBeVisible();
    expect(screen.getByText('Đã xong cả lộ trình')).toBeVisible();
  });

  it('home offers to start, then to continue with the next part', async () => {
    service.loadToday.mockResolvedValue(state({ talkLeft: 3, vocabLeft: 2 }));
    const { unmount } = render(<TodayHomeCard />);
    expect(await screen.findByRole('link', { name: 'Bắt đầu 15 phút' })).toHaveAttribute(
      'href',
      '/today',
    );
    unmount();
    service.loadToday.mockResolvedValue(state());
    render(<TodayHomeCard />);
    expect(await screen.findByRole('link', { name: 'Tiếp tục: Luyện cách nói' })).toBeVisible();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
  });
});
