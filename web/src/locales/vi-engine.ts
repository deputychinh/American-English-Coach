/** On-device scoring copy (split from `vi.ts` to keep files short). */
export const viEngine = {
  engine: {
    title: 'Chấm trên máy (thử nghiệm)',
    lead: 'Tải mô hình chấm về iPhone để chấm không cần máy tính. Bản thử: đo tốc độ trên máy này.',
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
    memory: (gigabytes: number): string => `RAM máy: ${gigabytes} GB`,
  },
};
