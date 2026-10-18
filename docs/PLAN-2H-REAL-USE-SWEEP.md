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

## Kết quả (01:17)

| Chỉ số                                     | Trước                                           | Sau                                 |
| ------------------------------------------ | ----------------------------------------------- | ----------------------------------- |
| Lượt chấm được trên 880 (440 từ × 2 giọng) | 852 (14 từ không có âm đích trong một biến thể) | 880                                 |
| Báo nhầm âm đích trên giọng chuẩn          | 18,0%                                           | 16,1%                               |
| /ʊr/ (tour, sure, pure)                    | 17/19                                           | 5/20                                |
| /ɔ/ (all, call, talk)                      | 11/16                                           | 6/20                                |
| /t/                                        | 7/20                                            | 0/20                                |
| /p/                                        | 6/20                                            | 3/20                                |
| Bộ thử thay âm (`synthetic_contrast`)      |                                                 | không đổi khi bật/tắt luật biến thể |

Đã làm:

- A1: `make sweep`.
- A2:
  - Thêm biến thể hợp lệ: trước /r/, caught–cot, âm tắc cuối từ không bật hơi, /t/ đầu từ bật hơi.
  - Thay 14 từ luyện.
  - "Gần đúng" được nửa điểm và giữ chuỗi.
  - Nhãn độ tin cậy cho 6 âm yếu.
- B1: e2e chế độ điện thoại kiểm giọng mẫu ở 5 màn.
- B2: màn Gương hiện lỗi giọng mẫu, dòng ghép nối hiển thị đúng trạng thái. Hiệu chỉnh tải lỗi được phép im lặng vì đã có banner 401.

Còn lại, cần người thật hoặc dữ liệu thật:

- Âm /ʊ/, /ʌ/, /ɔɪ/, /f/, /k/, /tʃ/ báo nhầm 35–80% với giọng chuẩn. Mô hình nhập các âm gần nhau; cần dữ liệu người học để hiệu chỉnh riêng từng âm.
- Âm thanh ra loa thoại sau khi thu âm trên iOS: chỉ kiểm được trên iPhone.
