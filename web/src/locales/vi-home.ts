/** "Today" home copy (split from `vi.ts` to keep files short). */
export const viHome = {
  placement: {
    title: 'Kiểm tra trình độ',
    lead: 'Khoảng 3 phút: nghe 12 câu từ dễ đến khó để biết nên bắt đầu ở cấp nào.',
    howTo: 'Bấm nút phát, nghe rồi chọn đáp án. Không cần nói, không có điểm phạt.',
    start: 'Bắt đầu kiểm tra',
    resultTitle: 'Bạn nên bắt đầu ở',
    levelLine: (title: string, percent: number): string => `${title} · ${percent}% đúng`,
    goPath: 'Bắt đầu học',
    retake: 'Làm lại',
    homeTitle: 'Bạn mới bắt đầu?',
    homeHint: 'Nghe 12 câu trong 3 phút để bắt đầu đúng cấp.',
    homeCta: 'Kiểm tra trình độ',
  },
  today: {
    greeting: (name: string): string => `Chào ${name}`,
    greetingNoName: 'Chào bạn',
    streak: (days: number): string => `${days} ngày liên tiếp`,
    settings: 'Cài đặt',
    goalTitle: 'Mục tiêu hôm nay',
    goal: (done: number, goal: number): string => `${done}/${goal} lượt`,
    goalDone: 'Xong mục tiêu hôm nay',
    continueLabel: 'Tiếp tục lộ trình',
    levelLine: (level: number, done: number, total: number): string =>
      `Cấp ${level} · ${done}/${total} đơn vị`,
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
