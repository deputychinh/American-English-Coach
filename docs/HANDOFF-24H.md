# Bàn giao 24h

Ngày 2026-10-16 · nhánh `feat/av-mvp` · chưa push, chưa merge (chờ chủ dự án).

## Đã giao (session chính: backend, tích hợp, commit)

- `backend/`: FastAPI `/api/v1` (health, content, assess, audio, progress, runs, calibration), domain thuần (inventory 39 âm + ánh xạ espeak/nearest-English, aligner Needleman-Wunsch, GopScorer với căn chỉnh ép CTC và blank làm đối thủ, catalogue lỗi người Việt, viseme, prosody, fusion, luật verdict dùng chung), adapter ML (wav2vec2 MPS, decoder audio, pyin, `say`), SQLite (SQLAlchemy 2), container composition root. 68 test, coverage 98%, ruff + mypy strict sạch.
- Quyết định kỹ thuật đã đo: `GOP_OK_THRESHOLD = -2.0` (BENCHMARK §5), luật "tin căn chỉnh ép khi GOP cao" giảm báo động giả 23,4% → 12,5% trên speechocean762 và 9/28 → 2/28 trên tập `say`.
- Repo: Makefile, CI (backend, web, repo, legacy), husky + commitlint + lint-staged, Prettier, compose tùy chọn, script vendor MediaPipe (43 MB không vào git), README, ADR 0001–0003.
- Legacy giữ nguyên dưới `legacy/` (33 unittest + 2 node test pass).

## Web (session web, đã tích hợp và kiểm chứng lại)

- `web/`: Next.js 16 static export, TS strict, 160 file nguồn theo cấu trúc `features/` (home, health, content, sounds, practice, mirror, calibration, progress) + `components/`, `hooks/`, `utils/`, `enums/`, `interfaces/`, `constants/` (toàn bộ copy tiếng Việt trong `copy.constant.ts`), design tokens + BEM, dark theme, PWA (manifest, service worker, icon).
- Pipeline camera: `useFaceLandmarker` (MediaPipe từ `/vendor/mediapipe`, GPU), `useMouthTracker` (ring buffer đặc trưng + viền môi, overlay, guard fps), `mouth-features`/`calibration`/`lip-outline`/`viseme-match` có unit test. Ghi âm: AudioWorklet → WAV 16 kHz (fallback ScriptProcessor), giới hạn 15 s.
- Cổng: lint 0 cảnh báo, typecheck sạch, Vitest 42 test (lines 89,98%), build 7 route, Playwright 10/10 (desktop + mobile, camera/mic giả, backend thật). Ảnh chụp trong `docs/screenshots/`.
- Đề xuất của session web chưa làm: `GET /content/pairs` kèm IPA tham chiếu để hiện trước khi ghi; viền môi cho lượt đã lưu (`?run=`) không có vì không lưu đặc trưng; Safari chưa chạy.

## Đã đo (session eval)

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
