# Kiểm chứng — 2026-10-16 (bản FastAPI + Next.js, nhánh `feat/av-mvp`)

Máy: Apple M4 Pro, 48 GB, macOS 27.0.1, Python 3.12.15 (uv), Node 26.10, Chromium (Playwright 1.64). Mọi số dưới đây là kết quả chạy thật trên máy này trong ngày; bản kiểm chứng của app cũ (2026-10-11) nằm ở cuối.

## Tự động (`make ci`)

| Phần              | Lệnh                                                                   | Kết quả                                             |
| ----------------- | ---------------------------------------------------------------------- | --------------------------------------------------- |
| Backend lint/type | `ruff format --check`, `ruff check`, `mypy` (strict)                   | sạch, 71 file                                       |
| Backend test      | `pytest` (unit + API với `FakeRecognizer`)                             | **68 pass**, coverage **98,1%** (ngưỡng 90)         |
| Web lint/type     | `next typegen && eslint --max-warnings 0 && stylelint`, `tsc --noEmit` | sạch                                                |
| Web test          | `vitest run --coverage`                                                | **42 pass** / 21 file, lines **89,98%** (ngưỡng 80) |
| Web build         | `next build` (static export)                                           | 7 route, `web/out` 45 MB (gồm MediaPipe 43 MB)      |
| Định dạng         | `prettier --check .`                                                   | sạch                                                |
| Legacy            | `make test-legacy`                                                     | 33 unittest + 2 node test pass                      |

## Trình duyệt (`make serve` + `make e2e`)

API phục vụ `web/out` trên `http://127.0.0.1:8765`; `/api/v1/health` trả `model_ready: true, tts_available: true`; `/`, `/practice/`, `/sw.js` trả 200.

Playwright, Chromium với camera và micro giả (`--use-fake-device-for-media-stream`), WAV "think" tạo bằng `say` làm nguồn micro, hai cấu hình desktop 1280 và mobile 390: **10/10 pass** (4,0 s):

- Trang chủ hiển thị trạng thái máy chấm và lối vào nhanh.
- Bảng 44 âm có 44 thẻ; mở chi tiết một âm.
- Luyện tập: ghi âm ~1,5 s → gọi `/assess` thật (model MPS) → thẻ kết quả 4 chip âm, mở chi tiết một âm. Với audio TTS "think", /θ/ được gắn `check` (nghe thành /s/), 3 âm còn lại `ok`.
- Gương khẩu hình yêu cầu hiệu chỉnh trước; trang hiệu chỉnh mở camera.
- Tiến độ liệt kê lượt luyện và cài đặt.

Ảnh chụp 12 trang (desktop + mobile) trong `docs/screenshots/`. Không có lỗi console ở lượt chạy cuối. Không request nào ra ngoài `127.0.0.1` (API bind loopback; MediaPipe và font nạp từ `web/public`).

## Chất lượng chấm (xem `docs/BENCHMARK-REALTIME.md`)

- Độ trễ model: MPS p95 0,032 s, CPU p95 0,088 s cho câu 2,83 s; tải model 2,5 s.
- speechocean762 (250 câu, 4.757 âm, người nói Mandarin): báo động giả 12,5% ở mức `check`, bắt được 64,7% âm sai, Pearson GOP–chuyên gia 0,474; không mục lỗi nào đạt precision ≥ 0,85 nên `enabled_errors.json` rỗng.
- Tập `say` (68 lượt, 2 giọng): 2/28 báo động giả trên prompt đúng, 33/40 prompt sai được phát hiện.

## Chưa kiểm chứng

- Giọng người Việt thật (cần pilot có đồng ý); Safari và thiết bị di động thật; camera thật trong e2e (camera giả của Chromium không có khuôn mặt nên gương chỉ được kiểm tra đến bước mở camera); HTTPS trên LAN.

---

## Bản local cũ (stdlib) — 2026-10-11

`python3 -m unittest discover -s tests -q`: 33 bài đạt; `node --test tests/lexicon-view.test.mjs`: 2 bài đạt; kiểm tra trình duyệt tay: tìm `about`, trang âm /iː/, font Noto Sans local, bố cục 390×844 không tràn ngang, thu thử MediaRecorder (bản ghi tổng hợp đã xóa). Chỉ mục: 466.550 mục, 72.072 có IPA, 115.655 có nghĩa Việt (dịch máy chưa kiểm duyệt). App này nay nằm ở `legacy/`.
