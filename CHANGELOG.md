# Nhật ký thay đổi

Theo [Keep a Changelog](https://keepachangelog.com/vi/1.1.0/); phiên bản theo [SemVer](https://semver.org/lang/vi/). Phiên bản dùng chung cho API, web và app iOS.

## [Unreleased]

### Thêm

- Ngoại tuyến có kiểm soát: service worker phiên bản theo build id precache toàn bộ vỏ ứng dụng; nội dung bài, khóa học, kế hoạch, tiến độ, hiệu chỉnh và giọng mẫu được giữ lại theo hồ sơ nên vẫn xem được khi máy chấm không chạy; `/health`, `/ready` và chấm điểm không bao giờ qua cache. Unit test chạy `sw.js` trong `node:vm` và e2e `offline.spec.ts`.

## [1.1.0] - 2026-10-17

### Thêm

- Hồ sơ nhiều người học: tạo/đổi tên/xóa, xuất và nhập tệp `aec-profile/1`; tiến độ, kế hoạch và hiệu chỉnh tách theo hồ sơ (header `X-Coach-Profile`, migration 0003).
- Kế hoạch tuần: `GET /plan` với chuỗi ngày liên tiếp, 7 ngày gần nhất theo múi giờ người học, 3 âm trọng tâm có lý do (yếu / ôn lại / mới); thẻ "Hôm nay luyện gì", mục tiêu mỗi ngày và nhắc luyện hằng ngày trên iOS.
- Khóa 14 ngày cho người Việt (`content/course.json`, `GET /course`, trang `/course/`) với tiến độ theo từng mục.
- Màn hình bắt đầu lần đầu (`/welcome/`): quyền micro/camera có giải thích, hồ sơ, hiệu chỉnh.
- Giao diện song ngữ Việt/Anh, đổi trong Cài đặt; không còn chuỗi cứng trong mã.
- Thư viện giọng người thật có giấy phép (`content/voice/`) ưu tiên trước giọng tổng hợp; header `X-Coach-Voice`.
- Công cụ pilot: `make pilot-export` / `make pilot-report` để bật mức `error` theo precision đo được.
- Kiểm tra tiếp cận bằng axe-core trên 10 trang trong e2e; hướng dẫn HTTPS từ xa (Tailscale/Caddy).

### Sửa

- Mốc thời gian trả về đúng UTC (`Z`), hiển thị đúng giờ Việt Nam.
- Image Docker: thêm Alembic, `httpx` là phụ thuộc chạy, torch bản CPU cho Linux.

## [1.0.0] - 2026-10-17

- Bản đầu: chấm 44 âm bằng wav2vec2 + GOP, gương khẩu hình MediaPipe, prosody, gia sư AI, ghép nối điện thoại, app iOS Capacitor.
