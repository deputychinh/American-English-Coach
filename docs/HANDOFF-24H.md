# Bàn giao 24h (đang cập nhật)

Phần này do session DOCS + EVAL khởi tạo; session chính bổ sung phần backend/web/commit.

## Đã đo (session eval)

- Độ trễ model âm vị trên máy này (Apple M4 Pro, 48 GB): xem `docs/BENCHMARK-REALTIME.md` §1.
- Tập đối chứng tổng hợp bằng `say` (68 lượt, 2 giọng): 9/28 prompt đúng bị `check` (0 `error`), 32/40 prompt sai được phát hiện; `data/eval/synthetic_contrast.json`, bảng ở BENCHMARK §2.
- speechocean762 (250 câu test, 125 người nói, 4.757 âm; Pearson GOP–chuyên gia 0,44; báo động giả mức error 4,4 %; không mục nào qua cổng → `enabled_errors.json = []`): `data/eval/speechocean762.json`, BENCHMARK §3; `content/enabled_errors.json` sinh từ cổng precision ≥ 0,85 và support ≥ 15.

## Tài liệu đã viết

`docs/adr/0001-0003`, `docs/architecture/README.md`, `docs/conventions.md`, `docs/testing.md`, `docs/README-DRAFT.md` (để gộp vào README.md), `docs/DATA-MANIFEST.json` (model, MediaPipe, dataset).

## Còn lại sau 24h

- Pilot với người học Việt (bản ghi có đồng ý, 2 người chấm độc lập) để hiệu chỉnh ngưỡng GOP và danh sách `enabled_errors` trên đúng nhóm mục tiêu; L2-ARCTIC (4 người Việt) khi có link.
- Prosody vẫn ở mức `check`; cần giọng mẫu người thật thay TTS.
- Ngưỡng khẩu hình trong `content/visemes.json` là giá trị khởi điểm, chưa đo trên video thật.
- HTTPS cho điện thoại trên LAN; Safari chỉ smoke test.
