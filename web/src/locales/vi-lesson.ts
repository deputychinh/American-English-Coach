/** Lesson player copy (split from `vi.ts` to keep files short). */
export const viLesson = {
  lesson: {
    title: 'Bài học',
    start: 'Bắt đầu bài học',
    resume: (step: number, total: number): string => `Học tiếp · bước ${step}/${total}`,
    review: 'Học lại bài này',
    loading: 'Đang chuẩn bị bài học…',
    notFound: 'Không tìm thấy đơn vị này trong lộ trình.',
    stepOf: (step: number, total: number, label: string): string =>
      `Bước ${step}/${total} · ${label}`,
    steps: {
      describe: 'Làm quen âm',
      discriminate: 'Nghe phân biệt',
      controlled: 'Luyện từng từ',
      guided: 'Nói theo câu mẫu',
      communicate: 'Dùng khi giao tiếp',
    },
    describeLead: 'Xem cách đặt miệng, bấm nghe từ khóa rồi bắt đầu.',
    example: 'Ví dụ',
    contrast: 'Dễ nhầm với',
    listen: (word: string): string => `Nghe “${word}”`,
    startListening: 'Bắt đầu nghe',
    next: 'Tiếp',
    skip: 'Bỏ qua',
    itemOf: (index: number, total: number): string => `${index}/${total}`,
    passedCount: (passed: number, total: number): string => `Đạt ${passed}/${total}`,
    gateTitle: 'Kiểm tra trước khi đi tiếp',
    gateShort: (passed: number, total: number, need: number): string =>
      `Bạn nói đạt ${passed}/${total} mục. Cần ${need} mục để qua bước này.`,
    gateOk: (passed: number, total: number): string =>
      `Bạn nói đạt ${passed}/${total} mục. Đủ để sang bước tiếp theo.`,
    retryFailed: 'Luyện lại mục chưa đạt',
    goOn: 'Vẫn đi tiếp',
    nextStep: 'Sang bước tiếp theo',
    scenario: 'Tình huống',
    doneTitle: 'Xong bài học!',
    doneListen: (percent: number): string => `Nghe đúng ${percent}%`,
    doneSpeak: (passed: number, total: number): string => `Nói đạt ${passed}/${total} mục`,
    doneAdvice:
      'Ngày mai quay lại ôn các mục chưa đạt; luyện ngắn mỗi ngày hiệu quả hơn một buổi dài.',
    backToCourse: 'Về lộ trình',
    restart: 'Học lại từ đầu',
  },
};
