# Lighthouse (bản tĩnh `web/out`, Chromium headless, Lighthouse 12, mobile preset)

Chạy bằng `npx serve out -l 3300` + `npx lighthouse@12 … --only-categories=performance,accessibility,best-practices`. Máy chấm không chạy khi đo, nên các trang hiện trạng thái "máy chấm chưa chạy" và trình duyệt ghi lỗi 404 cho `/api/v1/*` (đây là lý do cột Best practices không đạt 100; khi API chạy, lỗi này không xuất hiện). JSON đầy đủ nằm cạnh file này.

| Trang    | URL          | Performance | Accessibility | Best practices |   LCP |   CLS |  TBT |
| -------- | ------------ | ----------: | ------------: | -------------: | ----: | ----: | ---: |
| home     | `/`          |          95 |           100 |             96 | 2.6 s | 0.017 | 0 ms |
| sounds   | `/sounds/`   |          94 |           100 |             96 | 2.7 s |     0 | 0 ms |
| practice | `/practice/` |          94 |           100 |             96 | 2.8 s |     0 | 0 ms |

Ngày đo: 2026-10-16. Mục tiêu dự án: ≥ 90 mỗi cột; CSS được nhúng thẳng vào HTML (`experimental.inlineCss`) để bỏ các request chặn vẽ.
