/** Course, onboarding and privacy copy (split from `vi.ts` to keep files short). */
export const viCourse = {
  privacy: {
    title: 'Chính sách quyền riêng tư',
    updated:
      'Cập nhật 20/10/2026. Trên iPhone, giọng nói và hình ảnh của bạn được xử lý ngay trên máy.',
    sections: [
      {
        heading: 'Dữ liệu được xử lý ở đâu',
        paragraphs: [
          'Bản ghi âm được chấm ngay trên iPhone bằng gói chấm điểm đã tải về máy, rồi bỏ; không gửi đi đâu.',
          'Video camera chỉ được xử lý trên thiết bị để đo khẩu hình; không lưu, không gửi đi.',
          'Kết quả chấm, hồ sơ người học, tiến độ bài học, lựa chọn giao diện và mục tiêu ngày lưu trên thiết bị.',
          'Máy chấm riêng (tùy chọn, Cài đặt → Nâng cao): chỉ khi bạn tự kết nối, bản ghi âm và số đo khẩu hình (tám đặc trưng số và điểm viền môi) mới được gửi tới máy chấm bạn tự chạy trong cùng mạng, hoặc qua HTTPS do bạn cấu hình. Kết quả khi đó lưu trong tệp SQLite trên máy chấm đó.',
          'Gia sư AI chỉ có trên máy chấm riêng và mặc định tắt. Khi bạn cấu hình nhà cung cấp và bấm nút, kết quả đã chấm (văn bản) hoặc một ảnh miệng được gửi tới nhà cung cấp đó theo điều khoản của họ.',
        ],
      },
      {
        heading: 'Tải gói chấm điểm và giọng mẫu',
        paragraphs: [
          'Lần đầu, ứng dụng tải gói chấm điểm (khoảng 357 MB) từ GitHub. Như mọi lượt tải tệp, GitHub nhận địa chỉ IP của thiết bị; ứng dụng không gửi kèm thông tin nào khác.',
          'Giọng mẫu do AI của OpenAI tạo sẵn và đóng gói trong ứng dụng; ứng dụng không gửi gì tới OpenAI.',
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
          'Camera và Micro khi bạn luyện; Thông báo cho nhắc luyện (tùy chọn, chỉ hỏi khi bạn bật); Mạng nội bộ chỉ khi bạn kết nối máy chấm riêng.',
        ],
      },
      {
        heading: 'Xóa dữ liệu',
        paragraphs: [
          'Cài đặt → Dữ liệu trên thiết bị → "Xóa dữ liệu trên thiết bị này" xóa kết quả, hồ sơ và tiến độ. Xóa ứng dụng sẽ xóa cả gói chấm điểm. Trên máy chấm riêng: xóa hồ sơ trong Cài đặt → Hồ sơ, hoặc xóa tệp data/coach.sqlite3.',
        ],
      },
    ],
  },
  course: {
    title: 'Khóa 14 ngày cho người Việt',
    lead: 'Mỗi ngày 10–15 phút, từ âm cuối và /θ/ /ð/ đến nguyên âm, trọng âm và ngữ điệu.',
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
    lead: 'Bốn cấp, 24 đơn vị, mỗi đơn vị năm bước, đi từ lỗi người Việt hay mắc nhất.',
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
