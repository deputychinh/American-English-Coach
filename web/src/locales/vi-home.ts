/** "Today" home copy (split from `vi.ts` to keep files short). */
export const viHome = {
  today: {
    greeting: (name: string): string => `Chào ${name}`,
    greetingNoName: 'Chào bạn',
    streak: (days: number): string => `${days} ngày liên tiếp`,
    settings: 'Cài đặt',
    goalTitle: 'Mục tiêu hôm nay',
    goal: (done: number, goal: number): string => `${done}/${goal} lượt`,
    goalDone: 'Xong mục tiêu hôm nay',
    continueLabel: 'Tiếp tục lộ trình',
    unitLine: (index: number, title: string): string => `Đơn vị ${index} · ${title}`,
    next: {
      listen: 'Bước 2 · Nghe phân biệt',
      practice: 'Bước 3 · Luyện có chấm',
      shadow: 'Bước 4 · Shadowing',
      done: 'Đơn vị đã xong · ôn lại',
    },
    start: 'Bắt đầu',
    focusTitle: 'Âm cần luyện',
    focusEmpty: 'Luyện vài bài để app biết âm nào cần ôn.',
    tiles: {
      mirror: 'Gương',
      listen: 'Nghe',
      chart: '44 âm',
      path: 'Lộ trình',
    },
  },
};
