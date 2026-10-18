# Plan 2 giờ: kiểm thử như người dùng thật (19/10/2026, 00:35 → 02:35)

## Vì sao

Ngày 19/10 người dùng thử trên iPhone và gặp lỗi mà test không bắt được:

- "Nghe mẫu" bị 401 vì test luôn chạy trên chính máy Mac.
- Chấm quá gắt vì e2e dùng bộ nhận dạng giả, không ai chấm giọng thật cho cả 44 âm.

Plan này lấp hai khoảng trống đó.

## Việc làm (theo thứ tự ưu tiên)

| #   | Việc                                                                                                                                                                     | Kết quả kiểm chứng được                                                   |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| A1  | Quét máy chấm thật: 44 âm × 10 từ luyện × 2 giọng Mỹ của macOS (`say`). Ghi mỗi từ: âm đích có bị báo sai không, từ có trong từ điển không, giọng mẫu có tải được không. | `make sweep` → `data/eval/sound_sweep.json` + bảng tỉ lệ báo nhầm theo âm |
| A2  | Sửa các âm báo nhầm nhiều nhất: thay từ luyện TTS/mô hình không xử lý được, hoặc chỉnh ngưỡng nếu lỗi nằm ở luật chấm.                                                   | Tỉ lệ báo nhầm trên giọng đúng giảm, có số trước/sau                      |
| B1  | Rà mọi đường đi chỉ có trên điện thoại: mọi yêu cầu tới máy chấm phải có token, tài nguyên tải trong vỏ Capacitor, nghe/xếp lớp/âm chi tiết có phát giọng mẫu.           | e2e chế độ điện thoại phủ Nghe, Xếp lớp, Gương                            |
| B2  | Săn lỗi im lặng: chỗ nào hỏng mà người học không thấy thông báo.                                                                                                         | Mỗi chỗ hoặc hiện lỗi, hoặc ghi lý do vì sao được phép im                 |
| C   | `make ci`, e2e chế độ điện thoại, commit theo từng việc, push, cài lên iPhone.                                                                                           | CI xanh, app trên máy                                                     |

## Ngoài phạm vi

- Thử camera thật: simulator không có camera, cần người dùng cầm iPhone.
- Dữ liệu người học thật: chưa có pilot.
