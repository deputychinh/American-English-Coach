# Bàn giao 24h

Cập nhật 2026-10-17: `feat/av-mvp` đã merge fast-forward vào `main`; mọi việc sau đó làm trực tiếp trên `main` theo `docs/ROADMAP.md`. Bản 1.1.0 (xem `CHANGELOG.md`).

## Đã giao (session chính: backend, tích hợp, commit)

- `backend/`: FastAPI `/api/v1` (health, content, assess, audio, progress, runs, calibration), domain thuần (inventory 39 âm + ánh xạ espeak/nearest-English, aligner Needleman-Wunsch, GopScorer với căn chỉnh ép CTC và blank làm đối thủ, catalogue lỗi người Việt, viseme, prosody, fusion, luật verdict dùng chung), adapter ML (wav2vec2 MPS, decoder audio, pyin, `say`), SQLite (SQLAlchemy 2), container composition root. 68 test, coverage 98%, ruff + mypy strict sạch.
- Quyết định kỹ thuật đã đo: `GOP_OK_THRESHOLD = -2.0` (BENCHMARK §5), luật "tin căn chỉnh ép khi GOP cao" giảm báo động giả 23,4% → 12,5% trên speechocean762 và 9/28 → 2/28 trên tập `say`.
- Repo: Makefile, CI (backend, web, repo, legacy), husky + commitlint + lint-staged, Prettier, compose tùy chọn, script vendor MediaPipe (43 MB không vào git), README, ADR 0001–0003.
- Legacy giữ nguyên dưới `legacy/` (33 unittest + 2 node test pass).

## Phiên test cùng chủ dự án (2026-10-16 → 17)

- Sửa: bước hiệu chỉnh lặp vì timer phụ thuộc object tracker; trang trống khi mở `127.0.0.1:3200` ở dev (Next 16 `allowedDevOrigins`); `make web` bị bỏ qua vì trùng tên thư mục (`.PHONY`).
- Thêm: đặc trưng `teethVisible`/`tongueVisible` từ màu vùng trong môi + bước hiệu chỉnh "th"; bộ bài cho 44 âm (`scripts/build_sound_drills.py`, kiểm tra CMUdict); 12 nhóm viseme phủ 39 âm với `confidence`; API `/content/sounds`, `/content/sounds/{id}`; gia sư Kimi (`/tutor/explain`, `/tutor/mouth`), cấu hình qua `.env` (`.env.example`). Đo: model `kimi-k2.7-code-highspeed` trả lời ~2–6 s; `kimi-k2.6` đọc được ảnh nhưng suy luận 10 s+; Kimi chỉ nhận `temperature=1`; câu trả lời có thể rỗng khi hết token cho suy luận → budget 4000 + thử lại một lần.
- 2026-10-17: chuyển gia sư sang OpenAI `gpt-6-luna` theo yêu cầu (đo: giải thích 2–4 s, ảnh miệng 3 s; client dùng `max_completion_tokens`, không gửi temperature cho OpenAI). Kimi vẫn dùng được qua `.env`.
- Lưu ý bảo mật: key Kimi và key OpenAI đã được dán vào chat; chủ dự án nên thu hồi và tạo key mới sau khi test.

## Hoàn thiện mức sản phẩm (2026-10-17, theo `docs/backlog.md`)

- GitHub Actions xanh toàn bộ 5 job (backend, web, repo, legacy, e2e trên macOS với recognizer giả) tại commit `4cea475`: https://github.com/deputychinh/American-English-Coach/actions/runs/38957536818.

- ☑ AEC-001 CI xanh với iOS trong repo · ☑ AEC-003 Alembic (baseline 0001 + devices 0002, tự nâng cấp khi mở DB, DB thật 22 lượt đã nâng cấp) · ☑ AEC-004 log JSON + `X-Request-Id` · ☑ AEC-005 `COACH_RECOGNIZER=fake` + job e2e trên macOS (14/14 pass local) · ☑ AEC-006 giới hạn gia sư 10/phút · ☑ AEC-007 `/ready`.
- ☑ AEC-002 ghép nối điện thoại (backend + màn hình Cài đặt) · ☑ AEC-010…014 (hệ thống thiết kế, AppShell + tab bar, native polish, trạng thái/lỗi, Lighthouse 94–100) · ◐ AEC-015 i18n (copy tách khóa, `en` mới có khung).
- Chưa làm (P2): hồ sơ nhiều người học, lộ trình tuần, giọng mẫu người thật, pilot người Việt, phát hành TestFlight, HTTPS từ xa.

## iOS (2026-10-17)

- `web/ios/`: app Capacitor 8 (Swift host, SPM), id `com.deputychinh.americanenglishcoach`; icon/splash sinh từ `public/icons/icon.svg`; `Info.plist` có quyền camera/micro/mạng nội bộ và `NSAllowsLocalNetworking`.
- Địa chỉ máy chấm cấu hình lúc chạy (Tiến độ → Cài đặt → "Địa chỉ máy chấm", lưu `coach.apiBaseUrl`); mọi lời gọi `/api/*` được chuyển hướng trong `api-client.util.ts`; backend mở CORS cho `capacitor://localhost` và địa chỉ LAN; `make api-lan` nghe trên 0.0.0.0.
- Lệnh: `make ios-assets`, `make ios-sync`, `make ios-build`, `make ios-run` (simulator), `make ios-open` (Xcode, chạy máy thật). Tài liệu: `docs/ios.md`.
- Chưa: ký TestFlight; kiểm tra trên iPhone thật do chủ dự án thực hiện (camera không có trên simulator).

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

## Lộ trình hoàn thiện (2026-10-17 chiều, `docs/ROADMAP.md`)

- ☑ A1 hồ sơ nhiều người học · ☑ A2 kế hoạch tuần + mục tiêu ngày + nhắc luyện iOS · ☑ A3 mốc thời gian UTC · ☑ A4 backlog.
- ☑ B1 onboarding `/welcome/` · ☑ B2 song ngữ Việt/Anh · ☑ B3 axe-core 0 vi phạm serious/critical trên 11 trang (chữ 200 %: 11 trang ở 390 px không tràn ngang, không cắt chữ — đo bằng Chromium headless) · ☑ B4 ngoại tuyến có kiểm soát (service worker phiên bản theo build id, precache toàn bộ vỏ app, cache API đọc-only theo hồ sơ; 14 unit test + e2e `offline.spec.ts`).
- ☑ C1 công cụ pilot (`make pilot-export/report`, `docs/pilot.md`) — cần người Việt thu âm và người chấm · ☑ C2 thư viện giọng người thật (chỗ cắm + manifest giấy phép; chưa có clip) · ☑ C3 khóa 14 ngày.
- ☑ D1 HTTPS từ xa (`docs/remote-access.md`) · ☑ D2 hồ sơ phát hành (`docs/release/`, trang `/privacy/`) — ký TestFlight cần Team · ☑ D3 Docker đã kiểm chứng (3,97 GB) · ☑ D4 CHANGELOG + 1.1.0 (tag sau khi CI xanh).
- ◐ F1 lộ trình: schema + `GET /curriculum` + trang `/curriculum/` + cấp 1 (6 đơn vị) xong; còn cấp 2–4 và nội dung đi kèm (`docs/PLAN-RELEASE-100K.md`).
- ☑ E1 gương kiểu camera (`docs/design/mobile-mirror.md`) · ☑ E2 iPhone thật qua `make ios-device` · ☐ E3 màn luyện tập/kết quả kiểu app · ☐ E4 trang chủ kiểu iOS.
- Việc của chủ dự án: thu hồi hai API key đã dán trong chat; chạy trên iPhone thật; pilot người Việt; clip giọng có giấy phép; Apple Team.
