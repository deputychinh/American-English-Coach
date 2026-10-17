# Hệ thống thiết kế — American English Coach

Nguồn sự thật cho `web/src/styles/tokens/*.css` và các component dùng chung trong `web/src/components/`. Quy tắc viết CSS: BEM (khối = tên file), chỉ dùng token (`var(--…)`), thứ tự thuộc tính cố định (Stylelint). Mọi giá trị dưới đây đã có trong code; đổi token thì đổi tài liệu này cùng một commit.

## 1. Nguyên tắc

- **Ấm, bình tĩnh, tự tin**: sản phẩm học cho học sinh Việt Nam; không màu mè, không "gamification" chói. Saffron chỉ dùng cho hành động và điểm nhấn; bề mặt là trung tính ấm (ink); khoảng trắng rộng.
- **Một thang chữ** (`--text-xs … --text-5xl`), tiêu đề chữ Inter nặng 600, chữ IPA luôn dùng `--font-ipa` (Noto Sans) trong **viên nhuộm màu** `.ipa-pill` để ký hiệu đọc như ký hiệu.
- **Kết luận không bao giờ chỉ bằng màu**: `ok` (teal) ✓ "đạt", `check` (amber) ? "nghe lại", `error` (red) ✕ "sai" luôn đi cùng ký tự và chữ (`VerdictChip`, `result-card__totals`).
- **Mọi điều khiển ≥ 44 px**, vùng an toàn iOS được tôn trọng (`--safe-top`, `--safe-bottom`), thanh tab 5 mục ở ≤ 768 px và trong vỏ native.
- **Chuyển động 120–200 ms**, tắt hoàn toàn khi `prefers-reduced-motion`.
- **Giao diện tối** có giá trị riêng cho mọi token ngữ nghĩa (`[data-theme='dark']`).

## 2. Màu

Nguyên thủy (`tokens/colors.css`): `--color-saffron-50…900` (thương hiệu), `--color-ink-50…900` (trung tính ấm), `--color-teal-*` (đạt), `--color-amber-*` (cần nghe lại), `--color-red-*` (sai), `--color-blue-*` (thông tin).

| Token ngữ nghĩa                                                                                                | Sáng                                      | Tối                                       | Dùng                                     |
| -------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ----------------------------------------- | ---------------------------------------- |
| `--color-bg` / `--color-surface` / `--color-surface-raised`                                                    | ink-100 / #fff / #fff                     | ink-900 / ink-800 / ink-700               | Nền trang / thẻ / popover, toast         |
| `--color-text` / `--color-text-muted`                                                                          | ink-900 / ink-600                         | ink-50 / ink-400                          | Chữ chính / phụ                          |
| `--color-border` / `--color-border-control`                                                                    | ink-200 / ink-500                         | ink-700 / ink-500                         | Đường kẻ trang trí / viền ô nhập (≥ 3:1) |
| `--color-primary` (+ `-hover`, `-subtle`, `--color-on-primary-subtle`)                                         | saffron-600 / 700 / 50 / 700              | saffron-400 / 300 / 900 / 200             | Nút chính, liên kết, tab đang chọn       |
| `--color-success` / `--color-warning` / `--color-danger` / `--color-info` (+ `-subtle`, `--color-on-*-subtle`) | teal-600 / amber-700 / red-600 / blue-600 | teal-400 / amber-400 / red-400 / blue-400 | Ba mức kết luận, cảnh báo, thông tin     |
| `--color-brand-from` / `--color-brand-to` / `--color-brand-hover` / `--color-on-brand`                         | saffron-600 / 700 / trắng 14% / #fff      | saffron-800 / 900 / trắng 12% / #fff      | Header                                   |
| `--color-ipa-bg` / `--color-ipa-text`                                                                          | saffron-50 / saffron-800                  | saffron-900 / saffron-200                 | Viên IPA                                 |
| `--color-focus-ring`                                                                                           | saffron-500                               | saffron-400                               | Viền focus 2 px                          |

Tương phản (WCAG 2.2): chữ ink-900 trên ink-100 16:1; chữ phụ ink-600 trên trắng 7,6:1; trắng trên saffron-600 5,2:1; teal-600 / amber-700 / red-600 trên trắng 5,5 / 5,0 / 4,8:1; saffron-800 trên saffron-50 8,9:1.

## 3. Khoảng cách, chữ, hình

- Khoảng cách 4 px: `--space-1…20`; ngữ nghĩa `--padding-card`, `--padding-control(-sm/-lg)`, `--padding-page-x`, `--gap-stack/inline/grid`.
- Chữ: `--font-sans` Inter Variable; `--font-ipa` Noto Sans Variable; cỡ 11–48 px; `--leading-tight 1.2`, `--leading-normal 1.5`, `--leading-relaxed 1.7` (tiếng Việt dùng relaxed cho đoạn).
- Bo góc: `--radius-sm 4`, `-md 8`, `-lg 12`, `-xl 16`, `-full`. Bóng: `--shadow-sm/md/lg`. Z-index: `--z-sticky` (header, tab bar, thanh thu âm), `--z-toast`.
- Bố cục: `--container-max 1120px`, `--container-narrow 720px`, `--header-height 60px`, `--tabbar-height 60px`, `--size-touch-target 44px`.

## 4. Component dùng chung (`web/src/components`)

| Component                                | Vai trò                                                                                                         | Ghi chú                                             |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `AppShell`                               | Header + điều hướng desktop; tab bar 5 mục trên mobile/native; banner "cần ghép nối"; đồng bộ status bar native | Chỉ nơi duy nhất gọi `nativeConfigureChrome`        |
| `Card`                                   | Bề mặt duy nhất cho thẻ (`--tinted`, `--interactive`)                                                           | Không tự đặt margin ngoài                           |
| `SectionHeader`                          | Tiêu đề mục + gợi ý + hành động bên phải                                                                        | `id` phục vụ `aria-labelledby`                      |
| `Stat`                                   | Ô số liệu (`tone` success/warning)                                                                              | Số dùng `tabular-nums`                              |
| `Tabs`                                   | Tab phân đoạn ARIA                                                                                              | Panel do nơi gọi render                             |
| `ListRow`                                | Hàng danh sách 44 px, có/không liên kết                                                                         | `leading` thường là `.ipa-pill`                     |
| `IconButton` / `Icon`                    | Nút tròn 44 px một biểu tượng / bộ icon SVG nội tuyến (`IconName`)                                              | Icon trang trí `aria-hidden`                        |
| `Button`                                 | `primary`, `secondary`, `ghost`, `--small`, `--large`, `--full-width`                                           | Liên kết dạng nút dùng cùng lớp                     |
| `VerdictChip`                            | Một âm: IPA + ký tự + màu theo mức                                                                              | 44 px, có `aria-pressed`                            |
| `FeatureBar`                             | Thanh đo đặc trưng miệng với dải mục tiêu                                                                       | Dùng trong gương                                    |
| `ConfidenceBadge`                        | Mức camera thấy rõ / một phần / chỉ môi-hàm                                                                     | Nhãn từ API                                         |
| `EmptyState` / `ErrorState` / `Skeleton` | Ba trạng thái dữ liệu bắt buộc ở mọi màn hình                                                                   | `ErrorState` luôn có bước tiếp theo bằng tiếng Việt |
| `Toast` (`useToast`)                     | Xác nhận không chặn, tự tắt sau 3,5 s                                                                           | Hiện trên tab bar                                   |
| `AppErrorBoundary`                       | Màn hình lỗi thân thiện + Tải lại                                                                               | Bọc toàn app trong `layout.tsx`                     |
| `PageIntro`                              | H1 + đoạn dẫn + hành động                                                                                       | Mỗi trang đúng một H1                               |
| `WeekStrip`                              | Bảy ô ngày: đầy khi đạt mục tiêu, nửa khi có thu âm, viền hôm nay; nhãn ARIA đầy đủ từng ngày                   | Dùng trong `PlanCard`                               |

## 5. Mẫu màn hình

- **Trang chủ**: hero (CTA "Luyện ngay" + "Soi gương", huy hiệu hồ sơ đang dùng), 3 ô `Stat`, `PlanCard` "Hôm nay luyện gì" (tiến độ mục tiêu ngày, chuỗi ngày liên tiếp, `WeekStrip`, 3 âm trọng tâm có lý do Yếu/Ôn lại/Mới), lưới bắt đầu nhanh có icon, "Lần luyện gần nhất".
- **Bảng 44 âm**: ô tìm kiếm + `Tabs` lọc nhóm, lưới thẻ với `.ipa-pill`, panel chi tiết bên phải ở ≥ 1024 px.
- **Luyện tập**: tab "Theo âm" / "Cặp âm & câu"; phiên luyện = thẻ đề bài → camera + mục tiêu khẩu hình (cạnh nhau trên desktop, xếp dọc trên mobile) → **thanh thu âm dính đáy** trên mobile với vạch mức âm → thẻ kết quả với tổng kết trước, chip theo từng âm, gợi ý ngữ điệu, gia sư AI.
- **Gương**: camera toàn chiều rộng, điều khiển và thanh đo bên dưới, huy hiệu mức tin cậy, chuyển động đầu–cuối cho nguyên âm đôi.
- **Hiệu chỉnh**: stepper 6 bước (vạch tiến trình + vòng tròn), lời nhắc lớn, trạng thái khuôn mặt.
- **Tiến độ**: 4 ô `Stat`, `PlanCard` rút gọn "Tuần này", bảng theo âm xếp theo mức cần luyện, lần thu gần đây; nút mở Cài đặt.
- **Cài đặt** (`/settings/`): giao diện và ngôn ngữ (Tiếng Việt/English, nhớ trên thiết bị, `<html lang>` cập nhật), hồ sơ người học, mục tiêu mỗi ngày (1/3/5/10) và nhắc luyện iOS (danh sách có hàng đang dùng, tạo, đổi tên tại chỗ, xuất/nhập tệp, xóa có xác nhận inline), luyện tập, máy chấm (địa chỉ + kiểm tra), ghép nối điện thoại (mã 6 số), dữ liệu trên thiết bị, về ứng dụng.

## 6. Native (iOS)

Status bar đổi theo giao diện; splash màu thương hiệu, ẩn sau khi web vẽ; haptic nhẹ khi bắt đầu/dừng thu, "success" khi giữ đúng khẩu hình hoặc xong bài; giữ màn hình sáng trong phiên luyện/gương/hiệu chỉnh; tất cả no-op ngoài vỏ native (`web/src/utils/native.util.ts`).
