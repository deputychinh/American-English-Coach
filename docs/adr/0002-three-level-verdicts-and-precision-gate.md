# ADR 0002: Ba mức kết luận và cổng precision cho phản hồi lỗi phát âm

- Trạng thái: chấp nhận · 2026-10-16

## Bối cảnh

Model âm vị (`wav2vec2-xlsr-53-espeak-cv-ft`) chưa từng được kiểm chứng trên giọng người Việt. OpenPronounce tự công bố false alarm đáng kể với cùng loại pipeline. Sửa nhầm (bảo người học sai khi họ đúng) gây hại hơn bỏ sót.

## Quyết định

1. Mỗi âm nhận **một trong ba mức**: `ok`, `check` (“nghe chưa rõ, thử lại”), `error` (“bạn đang đọc /θ/ thành /t/” kèm hướng dẫn). Không có nhị phân đúng/sai.
2. `error` chỉ xuất hiện khi **cả ba** điều kiện đúng: (a) căn chỉnh cho thấy thay thế hoặc bỏ sót, (b) GOP dưới ngưỡng `GOP_OK_THRESHOLD`, (c) cặp (âm đích, âm nghe được) khớp một mục trong `content/vn_errors.json` **và** mục đó nằm trong `content/enabled_errors.json`.
3. `enabled_errors.json` được sinh bởi `app/eval/speechocean.py`: chỉ mục có **precision ≥ 0,85 và support ≥ 15** trên tập đánh giá. Không có số liệu thì danh sách rỗng và mọi lỗi chỉ hiện ở mức `check`.
4. Hình ảnh (khẩu hình) chỉ **nâng `check` → `error`** khi khẩu hình cũng lệch (bảng fusion trong `app/domain/fusion.py`); không bao giờ tự tạo `error` khi audio nói `ok`.
5. Prosody (trọng âm, ngữ điệu, nhịp) tối đa mức `check` cho tới khi có dữ liệu người Việt để hiệu chỉnh.
6. Người học có nút **“Tôi nói đúng mà”** (`POST /runs/{id}/dispute`); tỷ lệ phản bác theo âm là dữ liệu hiệu chỉnh cho lần sau.

## Hệ quả

- Bản đầu có thể “ít dám kết luận”; đây là chủ ý.
- Thay model phải chạy lại đánh giá và sinh lại `enabled_errors.json`; `model_version` lưu cùng mọi kết quả nên điểm cũ/mới không bị trộn.
