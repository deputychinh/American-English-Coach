/** Listening-step copy (split from `vi.ts` to keep files short). */
export const viListen = {
  listen: {
    title: 'Nghe phân biệt',
    lead: (unit: string): string =>
      `${unit} · Nghe trước, nói sau: chọn đúng từ, âm tiết mạnh hoặc từ trọng tâm bạn nghe được.`,
    backToPath: 'Về lộ trình',
    play: 'Phát âm thanh',
    whichWord: 'Bạn nghe thấy từ nào?',
    whichSyllable: 'Âm tiết nào được nhấn mạnh?',
    whichFocus: 'Từ nào là từ trọng tâm của câu?',
    progress: (index: number, total: number): string => `Câu ${index} / ${total}`,
    correct: 'Đúng rồi!',
    wrong: (answer: string): string => `Chưa đúng. Đáp án: ${answer}. Nghe lại để so sánh.`,
    next: 'Câu tiếp theo',
    finish: 'Xem kết quả',
    summaryTitle: 'Kết quả nghe',
    accuracy: 'Độ chính xác',
    answered: 'Đúng / tổng',
    adviceGood: 'Tai bạn đã phân biệt tốt. Chuyển sang bước luyện có chấm.',
    adviceAgain: 'Nghe lại lần nữa trước khi nói; phân biệt được bằng tai thì phát âm mới ổn định.',
    continuePractice: 'Sang bước luyện có chấm',
    again: 'Nghe lại từ đầu',
    noQuestions: 'Đơn vị này chưa có bài nghe.',
    doneBadge: (percent: number): string => `Đã nghe · ${percent}%`,
    start: 'Bắt đầu nghe',
  },
};
