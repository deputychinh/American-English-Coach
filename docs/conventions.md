# Quy ước mã nguồn

Cùng bộ quy ước với các dự án khác của nhóm (bazaar, relay, salesnow). Lint thực thi phần lớn; phần còn lại kiểm tra khi review.

## Chung

- **Nguồn duy nhất**: enum, hằng số, lỗi, interface dùng chung khai báo ở đúng một chỗ (`backend/app/enums.py`, `constants.py`, `errors.py`; web: `src/enums/*.enum.ts`, `src/constants/*.constant.ts`, `src/interfaces/*.interface.ts`) và import ở nơi khác.
- **Đơn vị độc lập**: module/feature chỉ phụ thuộc abstraction và thư mục của chính nó.
- **Backend = class + SOLID**; **frontend = arrow function + design token + BEM**.
- Lỗi không bao giờ bị nuốt; lỗi domain có mã ổn định (`ErrorCode`) và được đổi sang HTTP/UI đúng một lần ở biên.
- Không log dữ liệu cá nhân, audio hay đặc trưng miệng.
- Định dạng: Prettier (100 cột, nháy đơn, dấu phẩy cuối); Python: ruff format (100 cột).

## Backend (Python 3.12, `backend/`)

| Chủ đề   | Quy ước                                                                                                                                                                                                            |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Cấu trúc | `config/` (Settings đọc env `COACH_*`), `enums.py`, `constants.py`, `errors.py`, `domain/` (thuần), `ml/` (adapter), `repositories/`, `services/`, `routes/`, `schemas/`, `db/`, `container.py` (composition root) |
| Kiểu     | mypy `strict`; không `Any`; dataclass `frozen=True, slots=True` cho giá trị; pydantic cho biên API                                                                                                                 |
| Lint     | ruff với E, W, F, I, N, UP, B, SIM, RUF, ANN, D (google), PL, PT, S, C4, RET, ARG, C90 (≤ 8), PTH, TRY, ERA, ASYNC; `noqa` phải kèm lý do                                                                          |
| Class    | constructor injection, `_private`, một lý do thay đổi; service nhận port trừu tượng (`domain/ports.py`)                                                                                                            |
| Hằng số  | `UPPER_SNAKE_CASE` trong `constants.py`; số “ma thuật” trong so sánh đều có tên                                                                                                                                    |
| Test     | `tests/unit` cho domain/adapter nhẹ, `tests/api` qua `TestClient` + `FakeRecognizer`; tên test là câu; coverage ≥ 90 % (script và adapter torch bị loại trừ có ghi lý do trong `pyproject.toml`)                   |
| Dữ liệu  | thời gian UTC ISO-8601; id UUID v4 dạng chuỗi; JSON `snake_case` ở API Python (web dùng kiểu sinh tự động nên không chuyển đổi tay)                                                                                |

## Web (Next.js 16, `web/`)

| Chủ đề     | Quy ước                                                                                                                                                                                                                                                            |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Cấu trúc   | `src/app` (route), `src/features/<tên>/{components,hooks,services,index.ts}`, `src/components` (primitive dùng chung), `src/api` (schema sinh + client), `src/constants`, `src/enums`, `src/interfaces`, `src/utils`, `src/styles/{tokens,base,layout,components}` |
| Hàm        | chỉ arrow function; không class; không `any`; không `!`; `@/` alias, không `../../`                                                                                                                                                                                |
| CSS        | BEM: block = tên file (`PracticeCard.css` ↔ `.practice-card`); chỉ token (`var(--…)`) cho màu, khoảng cách, cỡ chữ, bo góc, bóng, z-index, thời lượng; mobile-first `@media (--bp-md)`; thứ tự thuộc tính cố định                                                  |
| Trạng thái | server state qua fetch trong service của feature; URL state cho lựa chọn bài; local `useState/useReducer`; `useEffect` chỉ để đồng bộ với hệ thống ngoài (camera, mic, MediaPipe)                                                                                  |
| UI         | mọi màn dữ liệu có loading/empty/error/success; màu không là tín hiệu duy nhất; bàn phím dùng được                                                                                                                                                                 |
| Test       | Vitest + Testing Library qua role/label; coverage dòng ≥ 80 % (route và schema sinh loại trừ); Playwright với camera/mic giả cho hành trình chính                                                                                                                  |
| PWA        | `public/sw.js` là nguồn, không sửa `out/sw.js`; `npm run build` chạy `scripts/build-sw.mjs` đóng dấu build id + asset; endpoint đọc-only mới muốn xem được ngoại tuyến thì thêm vào `OFFLINE_API`; test qua harness `src/test-utils/service-worker.ts`             |

## Commit và nhánh

- Conventional Commits, scope trong `commitlint.config.mjs`: `repo, plan, docs, api, ml, web, content, legacy, infra, ci, e2e, deps`.
- Một commit cho một đơn vị việc hoàn chỉnh (code + test + docs), ví dụ `feat(api): add phoneme assessment endpoint`.
- Husky chạy Prettier (pre-commit) và commitlint (commit-msg); CI chạy lại cả hai.
- Đổi hành vi hoặc quyết định thì cập nhật ADR/docs trong cùng commit.

## Copy và ngôn ngữ (web)

- Không có chuỗi hiển thị cứng trong component, hook, service hay util. Component đọc copy qua `useCopy()` (re-render khi đổi ngôn ngữ); mã ngoài React dùng `getCopy()` từ `src/locales`.
- `vi` là nguồn sự thật (`Copy = typeof vi`); `en` được khai báo kiểu `Copy` nên thiếu khóa là lỗi biên dịch, và `src/locales/locales.test.ts` so khóa hai chiều.
- Tệp copy tối đa 300 dòng: tách theo mảng (`vi-practice.ts`, `vi-settings.ts`, `en-*.ts`).
- Nội dung từ API (gợi ý khẩu hình, nhận xét, tên nhóm) là tiếng Việt theo thiết kế sản phẩm; chỉ giao diện song ngữ.
