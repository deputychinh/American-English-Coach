/** Course, onboarding and privacy copy (split from `vi.ts` to keep files short). */
export const viCourse = {
  privacy: {
    title: 'Chính sách quyền riêng tư',
    updated:
      'Cập nhật ngày 17/10/2026. Ứng dụng và máy chấm là phần mềm bạn tự chạy; không có máy chủ của nhà phát triển nhận dữ liệu của bạn.',
    sections: [
      {
        heading: 'Dữ liệu được xử lý ở đâu',
        paragraphs: [
          'Video camera chỉ được xử lý trên thiết bị để đo khẩu hình; không lưu, không gửi đi.',
          'Số đo khẩu hình (tám đặc trưng số và điểm viền môi) và bản ghi âm của lượt luyện được gửi tới máy chấm bạn tự chạy trên máy tính trong cùng mạng, hoặc qua HTTPS do bạn cấu hình. Bản ghi âm được chấm rồi bỏ; kết quả lưu trong tệp SQLite trên máy chấm đó.',
          'Hồ sơ người học, lựa chọn giao diện và mục tiêu ngày lưu trên thiết bị và trên máy chấm của bạn.',
          'Gia sư AI mặc định tắt. Chỉ khi bạn cấu hình nhà cung cấp và bấm nút, ứng dụng gửi kết quả đã chấm (văn bản) hoặc một ảnh miệng tới nhà cung cấp đó theo điều khoản của họ.',
        ],
      },
      {
        heading: 'Không có',
        paragraphs: [
          'Tài khoản, quảng cáo, telemetry, phân tích hành vi hay chia sẻ với bên thứ ba.',
        ],
      },
      {
        heading: 'Quyền truy cập',
        paragraphs: [
          'Camera và Micro chỉ khi bạn bật; Mạng nội bộ để tới máy chấm; Thông báo cho nhắc luyện (tùy chọn).',
        ],
      },
      {
        heading: 'Xóa dữ liệu',
        paragraphs: [
          'Cài đặt → "Xóa dữ liệu trên thiết bị này". Trên máy chấm: xóa hồ sơ trong Cài đặt → Hồ sơ, hoặc xóa tệp data/coach.sqlite3.',
        ],
      },
    ],
  },
  course: {
    title: 'Khóa 14 ngày cho người Việt',
    lead: 'Mỗi ngày 10–15 phút, đi từ âm cuối và /θ/ /ð/ tới nguyên âm, trọng âm và ngữ điệu. Mỗi mục là một bài có sẵn; ngày hoàn thành khi mọi mục đã có ít nhất một lần thu được chấm.',
    statDone: 'Ngày đã xong',
    statCurrent: 'Ngày hiện tại',
    dayShort: (index: number): string => `Ngày ${index}`,
    dayTitle: (index: number, title: string): string => `Ngày ${index} · ${title}`,
    minutes: (minutes: number): string => `${minutes} phút`,
    itemsDone: (done: number, total: number): string => `${done}/${total} mục`,
    currentBadge: 'Đang học',
    kind: { sound: 'Âm', pair: 'Cặp', sentence: 'Câu' },
    runs: (count: number): string => `${count} lần thu`,
    notYet: 'Chưa luyện',
    loadFailed: 'Không tải được khóa học từ máy chấm.',
  },
  curriculum: {
    title: 'Lộ trình phát âm chuẩn',
    lead: 'Bốn cấp, mỗi đơn vị 4–5 ngày × 10–15 phút theo một vòng năm bước: xem khẩu hình, nghe phân biệt, luyện có chấm, shadowing, dùng trong hội thoại. Thứ tự bài đi từ lỗi người Việt hay mắc nhất.',
    quickPath: 'Lộ trình nhanh 14 ngày',
    statDone: 'Đơn vị đã xong',
    statCurrent: 'Đang học',
    unitShort: (index: number): string => `Đơn vị ${index}`,
    levelTitle: (id: string, title: string): string => `Cấp ${id.replace('L', '')} · ${title}`,
    unitsDone: (done: number, total: number): string => `${done}/${total} đơn vị`,
    meta: (days: number, minutes: number): string => `${days} ngày · ${minutes} phút/ngày`,
    currentBadge: 'Đang học',
    doneBadge: 'Đã xong',
    vnError: 'Người Việt hay mắc',
    steps: {
      describe: 'Xem khẩu hình',
      discriminate: 'Nghe phân biệt',
      controlled: 'Luyện có chấm',
      guided: 'Shadowing',
      communicate: 'Dùng trong hội thoại',
    },
    discriminateSummary: (pairs: number, stress: number, focus: number): string =>
      [
        pairs ? `${pairs} cặp từ` : '',
        stress ? `${stress} từ trọng âm` : '',
        focus ? `${focus} câu từ trọng tâm` : '',
      ]
        .filter(Boolean)
        .join(' · '),
    comingSoon: 'Sắp có',
    proSoon: 'Gói Pro · sắp có',
    targetWords: 'Từ mục tiêu',
    itemDone: 'đã chấm',
    loadFailed: 'Không tải được lộ trình từ máy chấm.',
  },
  onboarding: {
    title: 'Bắt đầu với American English Coach',
    lead: 'Ba bước, khoảng một phút: quyền truy cập, hồ sơ của bạn và hiệu chỉnh khẩu hình.',
    stepsAria: 'Các bước bắt đầu',
    steps: { intro: 'Quyền truy cập', profile: 'Hồ sơ', calibrate: 'Hiệu chỉnh' },
    introTitle: 'Ứng dụng cần gì và vì sao',
    introMic: 'Micro để thu âm bạn đọc từ và câu; máy chấm từng âm trên máy tính của bạn.',
    introCamera: 'Camera để soi môi, hàm, răng và lưỡi lộ ra theo thời gian thực.',
    introPrivacy:
      'Video không rời thiết bị. Chỉ các số đo khẩu hình và bản ghi âm được gửi tới máy chấm local.',
    allow: 'Cho phép micro và camera',
    asking: 'Đang hỏi quyền…',
    later: 'Để sau',
    next: 'Tiếp tục',
    granted: 'đã cho phép',
    denied: 'bị từ chối',
    missing: 'không có thiết bị',
    micStatus: (state: string): string => `Micro: ${state}`,
    cameraStatus: (state: string): string => `Camera: ${state}`,
    profileTitle: 'Ai sẽ luyện?',
    profileLead:
      'Mỗi người một hồ sơ để tiến độ, kế hoạch tuần và hiệu chỉnh không lẫn nhau. Có thể đổi trong Cài đặt.',
    profileName: 'Tên của bạn',
    profilePlaceholder: 'Ví dụ: Minh',
    createProfile: 'Tạo hồ sơ và tiếp tục',
    useDefault: 'Dùng hồ sơ mặc định',
    profileOffline: 'Chưa kết nối được máy chấm nên chưa tạo được hồ sơ.',
    skipProfile: 'Bỏ qua bước này',
    calibrateTitle: 'Hiệu chỉnh khẩu hình (20 giây)',
    calibrateLead:
      'Gương và nhận xét khẩu hình cần học miệng của bạn một lần. Bạn có thể làm ngay hoặc khi mở gương lần đầu.',
    calibrateNow: 'Hiệu chỉnh ngay',
    finish: 'Để sau, vào trang chủ',
  },
};
