# Phát hành iOS (TestFlight → App Store)

Việc cần Apple Developer Team của chủ dự án được đánh dấu **[Team]**. Mọi bước khác đã sẵn trong repo.

## Trước khi ký

- [ ] `make ci` xanh trên `main`, tag `vX.Y.Z` đã đẩy, `CHANGELOG.md` có mục phiên bản.
- [ ] Phiên bản thống nhất: `backend/pyproject.toml`, `backend/app/main.py`, `web/package.json`, `web/src/constants/ui.constant.ts`, `MARKETING_VERSION` trong `web/ios/App/App.xcodeproj/project.pbxproj` (tăng `CURRENT_PROJECT_VERSION` mỗi lần nộp).
- [ ] `make ios-assets` nếu icon/splash đổi; `make ios-build` thành công trên simulator.
- [ ] Chạy tay trên iPhone thật (camera, micro, ghép nối Wi‑Fi, nhắc luyện) theo `docs/ios.md`.

## Ký và nộp **[Team]**

1. `make ios-open` → Signing & Capabilities: chọn Team, bundle id `com.deputychinh.americanenglishcoach`, bật Automatically manage signing.
2. Product → Archive → Distribute App → TestFlight & App Store → Upload.
3. App Store Connect → TestFlight: thêm người thử nội bộ; ghi chú bản thử lấy từ `CHANGELOG.md`.
4. App Store → bản ghi ứng dụng: điền từ `app-store.md`; Privacy Policy URL trỏ tới trang `/privacy/` của bản web đã triển khai (hoặc tệp `privacy-policy.md` đăng công khai).
5. App Privacy (bảng câu hỏi): dữ liệu **không** thu thập; audio và số đo khẩu hình chỉ gửi tới máy chấm do người dùng tự vận hành; gia sư AI là tùy chọn, chỉ khi người dùng bấm, gửi tới nhà cung cấp do họ cấu hình. Khai báo "Data Not Collected" và giải thích trong Review Notes.
6. Review Notes cho Apple: app cần máy chấm chạy trên máy tính cùng mạng; cung cấp video demo hoặc một máy chấm HTTPS tạm (xem `docs/remote-access.md`) kèm mã ghép nối.

## Ảnh chụp

Kích cỡ bắt buộc hiện tại: iPhone 6,9" (1320×2868) và 6,5" (1284×2778); iPad 13" (2064×2752) nếu bật iPad. Chụp trên simulator tương ứng bằng `xcrun simctl io booted screenshot`, mỗi màn: Trang chủ (kế hoạch tuần), Luyện tập (kết quả theo âm), Gương khẩu hình, Khóa 14 ngày, Tiến độ.

## Sau khi phát hành

- Tag release trên GitHub với ghi chú từ `CHANGELOG.md`.
- Theo dõi crash trong Xcode Organizer; app không có telemetry riêng.
