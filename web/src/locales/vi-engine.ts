/** On-device scoring copy (split from `vi.ts` to keep files short). */
export const viEngine = {
  engine: {
    advancedGroup: 'Nâng cao',
    serverRow: 'Máy chấm riêng (lớp học, phát triển)',
    packTitle: 'Tải gói chấm điểm',
    packBody: (megabytes: number): string =>
      `${megabytes} MB, chỉ tải một lần, nên dùng Wi-Fi. Sau đó app chấm ngay trên máy này, không cần mạng. Trong lúc chờ, bạn vẫn nghe, soi gương và học bài.`,
    packStart: 'Tải ngay',
    packProgress: (percent: number): string => `Đang tải gói chấm điểm… ${percent}%`,
    packRetry: 'Thử lại',
    packFailed: (reason: string): string => `Chưa tải xong: ${reason}`,
    packReady: 'Gói chấm điểm đã sẵn sàng trên máy.',
    needModel: 'Cần tải gói chấm điểm trước (Trang chủ hoặc Cài đặt → Chấm trên máy).',
    advanced: 'Đo tốc độ (dành cho kiểm thử)',
    title: 'Chấm trên máy',
    lead: 'Chấm phát âm ngay trên máy này: giọng nói của bạn không rời khỏi máy.',
    rowReady: 'Đã tải',
    rowMissing: 'Chưa tải',
    download: (megabytes: number): string => `Tải mô hình (${megabytes} MB)`,
    downloading: (percent: number): string => `Đang tải… ${percent}%`,
    cancel: 'Hủy',
    load: 'Nạp mô hình',
    benchmarkCpu: 'Đo tốc độ (CPU)',
    benchmarkCoreML: 'Đo tốc độ (Neural Engine)',
    working: 'Đang đo…',
    loaded: (milliseconds: number, coreML: boolean): string =>
      `Đã nạp sau ${milliseconds} ms${coreML ? ' · Neural Engine' : ' · CPU'}`,
    result: (seconds: number, median: number, best: number): string =>
      `${seconds} giây âm thanh: trung vị ${median} ms, nhanh nhất ${best} ms`,
    noServer: 'Cần ghép nối với máy chấm để tải bản thử nghiệm.',
    failed: (reason: string): string => `Không thực hiện được: ${reason}`,
    usePreference: 'Dùng chấm trên máy khi luyện tập',
    usePreferenceHint: 'Chấm, lưu tiến độ và kế hoạch ngay trên máy này, không cần máy tính.',
    memory: (gigabytes: number): string => `RAM máy: ${gigabytes} GB`,
    webManifestFailed: (status: number): string =>
      `Không tìm thấy gói chấm điểm trên máy chủ web (HTTP ${status}).`,
    webPartFailed: (status: number): string => `Tải một phần gói bị lỗi (HTTP ${status}).`,
    webPartCorrupt: 'Một phần gói bị hỏng khi tải. Bấm Thử lại, app tải tiếp từ chỗ dừng.',
    webNoOutput: 'Mô hình không trả kết quả.',
    webCancelled: 'Đã hủy. Lần sau app tải tiếp từ chỗ dừng.',
  },
};
