# ADR 0001: Stack và bố cục repo (FastAPI + uv, Next.js static export, giữ app cũ trong `legacy/`)

- Trạng thái: chấp nhận · 2026-10-16
- Thay thế: quyết định D8/D9 trong [PLAN-24H-AV-PRONUNCIATION.md](../PLAN-24H-AV-PRONUNCIATION.md) (xây trong app stdlib, frontend vanilla JS)

## Bối cảnh

Bản 24h ban đầu định xây thêm trên app Python stdlib + vanilla JS để tiết kiệm giờ. Chủ dự án duyệt với yêu cầu bổ sung: **mã production, theo đúng pattern các dự án đã làm** (bazaar, relay, salesnow): backend Python có `pyproject` + uv, ruff/mypy strict, pytest có ngưỡng coverage; frontend Next.js + TypeScript strict, ESLint/Stylelint BEM + design tokens; `Makefile` một lệnh một việc; CI GitHub Actions; Conventional Commits có `scope-enum`; `docs/adr`, `docs/architecture`.

App cũ (`coach/`, `static/`, `app.py`) có 33 test pass và dữ liệu từ điển hữu ích, nhưng không có kiểu tĩnh, không framework, không lint. Chuyển nó sang pattern mới tốn hơn viết lại phần cần thiết.

## Quyết định

1. **Backend mới `backend/`**: FastAPI, Python 3.12 qua `uv`, SQLAlchemy 2 trên SQLite, PyTorch/transformers cho model âm vị, librosa cho prosody. Ruff (bộ rule đầy đủ, độ phức tạp ≤ 8), mypy `strict`, pytest với `--cov-fail-under=90`.
2. **Web mới `web/`**: Next.js 16 (App Router) xuất tĩnh (`output: 'export'`), TypeScript 6 strict, ESLint 10 flat config + Stylelint BEM/tokens sao chép từ bazaar, Vitest + Testing Library, kiểu API sinh từ `backend/openapi.json` bằng openapi-typescript.
3. **Một cổng khi chạy production local**: FastAPI phục vụ `web/out` tại `/` và API tại `/api/v1` (`make serve`). Khi phát triển, `next dev` proxy `/api/v1` sang API.
4. **App cũ chuyển nguyên vẹn vào `legacy/`**, vẫn chạy và test được (`make test-legacy`), dùng chung `content/` và `vendor/`. Không xóa cho tới khi web mới có đủ tính năng tra từ điển/nghe chép.
5. **Dữ liệu dùng chung ở gốc repo**: `content/` (nội dung tiếng Việt, catalogue lỗi, viseme, cặp tối thiểu, câu), `vendor/` (CMUdict, ipa-dict, thichhoc), `data/` (model, dataset, SQLite, audio cache; gitignore).

## Hệ quả

- Tốn thêm khoảng 4–6 giờ cho scaffold, lint và CI so với kế hoạch cũ; bù lại code kiểm thử được, có kiểu, cùng chuẩn với các dự án khác.
- Người dùng cần Python 3.12 + uv và Node ≥ 24 khi phát triển; người học chỉ cần `make serve` (hoặc Docker tùy chọn).
- Hai bộ test tồn tại song song (backend/web và legacy) cho tới khi legacy được gỡ.
