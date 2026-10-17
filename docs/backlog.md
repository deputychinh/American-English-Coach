# Backlog — hoàn thiện mức sản phẩm (không phải MVP)

Mỗi ticket có tiêu chí nghiệm thu; một commit Conventional Commit cho mỗi ticket, id ở cuối subject (`feat(api): … [AEC-012]`). Trạng thái: ☐ chưa · ◐ đang · ☑ xong.

## P1 — Nền tảng và an toàn

| ID      | Trạng thái | Phạm vi                                      | Tiêu chí nghiệm thu                                                                                                                                                      |
| ------- | ---------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| AEC-001 | ☑          | CI xanh toàn bộ (`make ci`) sau khi thêm iOS | ESLint/Prettier bỏ qua `web/ios`, `web/assets`; stylelint sạch                                                                                                           |
| AEC-002 | ☑          | **Ghép nối điện thoại có mã**                | `make api-lan` in mã ghép nối; app nhập mã → nhận token (`POST /api/v1/pair`); mọi request không từ loopback phải mang `X-Coach-Token`; token lưu trên máy; test 401/200 |
| AEC-003 | ☑          | **Di trú CSDL** bằng Alembic                 | `alembic upgrade head` tạo lược đồ; `make migrate`; không còn `create_all` ở runtime; test migration trên DB trống và DB có dữ liệu cũ                                   |
| AEC-004 | ☑          | **Log có cấu trúc + request id**             | JSON log một dòng/sự kiện; `X-Request-Id` trả về và ghi trong log lỗi; không log audio/ảnh/key                                                                           |
| AEC-005 | ☑          | **Recognizer giả cho CI**                    | `COACH_RECOGNIZER=fake` → API chạy không cần model; job CI `e2e` chạy Playwright trên ubuntu với backend giả + `web/out`                                                 |
| AEC-006 | ☑          | Giới hạn tần suất gia sư AI                  | ≤ 10 yêu cầu tutor/phút/token; 429 problem+json; test                                                                                                                    |
| AEC-007 | ☑          | Health/readiness tách bạch                   | `/api/v1/health` (liveness) và `/api/v1/ready` (model nạp xong, DB ok); `make doctor` dùng `/ready`                                                                      |

## P1 — Giao diện và trải nghiệm

| ID      | Trạng thái | Phạm vi                                             | Tiêu chí nghiệm thu                                                                                                                                                              |
| ------- | ---------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AEC-010 | ☑          | **Hệ thống thiết kế thống nhất**                    | `docs/design-system.md` của dự án; mọi trang dùng cùng thành phần (Card, Button, Badge, Tabs, ListRow, EmptyState, ErrorState, Skeleton, Toast); không còn style lệch giữa trang |
| AEC-011 | ☑          | **Điều hướng kiểu app trên di động/iOS**            | Thanh tab dưới 5 mục trên màn ≤ 768 px và trong vỏ native; header tôn trọng `env(safe-area-inset-*)`; vùng chạm ≥ 44 px                                                          |
| AEC-012 | ☑          | Native polish (Capacitor)                           | StatusBar, SplashScreen, Haptics, Keyboard, giữ màn hình sáng khi luyện; `PrivacyInfo.xcprivacy`; version/build; icon và splash chuẩn                                            |
| AEC-013 | ☑          | Trạng thái và lỗi                                   | Mọi màn hình: loading/empty/error/success; ErrorBoundary toàn cục; thông điệp lỗi tiếng Việt hành động được                                                                      |
| AEC-014 | ☑          | Lighthouse ≥ 90 (Performance, A11y, Best Practices) | Báo cáo lưu `docs/lighthouse/`                                                                                                                                                   |
| AEC-015 | ☑          | i18n sẵn sàng                                       | Copy tách theo khóa (`src/locales/vi.ts`), khung `en`; không chuỗi cứng trong component                                                                                          |

## P2 — Sản phẩm

| ID      | Trạng thái | Phạm vi                                         | Tiêu chí nghiệm thu                                                                            |
| ------- | ---------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| AEC-020 | ☑          | Hồ sơ nhiều người học                           | Chọn/tạo hồ sơ; kết quả và hiệu chỉnh theo hồ sơ; export/import                                |
| AEC-021 | ☑          | Lộ trình học theo tuần                          | Kế hoạch từ tiến độ đo được; nhắc luyện; thẻ "hôm nay"                                         |
| AEC-022 | ☐          | Giọng mẫu người thật                            | Bộ clip có giấy phép thay `say` cho 44 âm + câu                                                |
| AEC-023 | ☐          | Pilot người Việt và bật `error` theo bằng chứng | Precision ≥ 0,85 trên tập người Việt; `enabled_errors.json` sinh từ dữ liệu thật               |
| AEC-024 | ☐          | Phát hành iOS                                   | Ký với Team, TestFlight nội bộ, App Store metadata, ảnh chụp theo kích cỡ, chính sách riêng tư |
| AEC-025 | ☐          | HTTPS cho máy chấm từ xa                        | Caddy/Tailscale; app chấp nhận `https://`                                                      |
