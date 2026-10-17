# Pilot người Việt và cổng precision

Mức `error` (đỏ) chỉ được bật cho một loại lỗi khi có bằng chứng trên người Việt thật: precision ≥ 0,85 với ≥ 20 dòng đã được người chấm đánh giá (`backend/app/constants.py::ERROR_PRECISION_GATE`, `app/eval/pilot.py::MIN_SUPPORT`). Trước đó mọi phát hiện chỉ hiện ở mức `check` (vàng). Quy trình dưới đây là việc người thật phải làm; công cụ đã sẵn.

## 1. Thu thập có đồng ý

- Mỗi người học một hồ sơ (Cài đặt → Hồ sơ). Giải thích rằng bản ghi âm được dùng để chấm và, nếu họ đồng ý, để người chấm nghe lại; video không bao giờ rời thiết bị.
- Lưu bản đồng ý (mẫu: tên hồ sơ, ngày, chữ ký) ngoài repo. Không commit bản ghi âm.
- Để người học bấm "Tôi nói đúng mà" khi không đồng ý với máy: cờ `disputed` đi vào bảng xuất.
- Muốn nghe lại khi chấm tay: chạy API với `COACH_KEEP_AUDIO=1` _(chưa có — xem Giới hạn)_ hoặc ghi âm song song bằng máy ghi riêng theo `run_id` hiển thị trên thẻ kết quả.

## 2. Xuất bảng chấm

```sh
make pilot-export          # data/pilot.csv
```

Mỗi dòng là một âm bị máy đánh dấu (`check`/`error` kèm `error_id`) cộng mỗi âm `ok` thứ mười làm đối chứng. Cột `label` để trống cho người chấm:

| label     | nghĩa                                          |
| --------- | ---------------------------------------------- |
| `wrong`   | người học thật sự mắc đúng lỗi máy nêu         |
| `correct` | người học nói đúng, máy báo nhầm (false alarm) |
| `unsure`  | không kết luận được (không tính vào precision) |

Người chấm độc lập với người phát triển; nên có hai người chấm và chỉ giữ dòng hai người đồng ý.

## 3. Báo cáo và bật lỗi

```sh
make pilot-report          # in bảng precision theo error_id, tỷ lệ báo nhầm, ghi data/enabled_errors.candidates.json
```

Chỉ chép các `error_id` đạt `PASS` vào `content/enabled_errors.json` (commit kèm bảng báo cáo vào `docs/VERIFICATION.md`). Test `tests/api/test_assess.py::test_th_said_as_t_is_error_once_precision_gate_enables_it` chứng minh cơ chế bật.

## Giới hạn

- Bản ghi âm không được lưu trên máy chấm (thiết kế riêng tư); người chấm cần nghe trực tiếp hoặc thu song song. Nếu pilot cần lưu audio, thêm cờ cấu hình riêng và chính sách xóa trước khi dùng.
- Bộ speechocean762 (`make eval`) chỉ hiệu chỉnh ngưỡng GOP trên người nói tiếng Trung; không thay cho pilot người Việt.
