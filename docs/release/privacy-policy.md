# Chính sách quyền riêng tư — American English Coach

Cập nhật: 2026-10-20 (bản iOS 1.0 chấm điểm ngay trên iPhone). Nội dung giống trang "Chính sách quyền riêng tư" trong ứng dụng.

**Ai vận hành**: không có máy chủ của nhà phát triển nhận dữ liệu của bạn. Ứng dụng tự chạy trên iPhone; máy chấm riêng (nếu có) là phần mềm bạn tự chạy.

**Dữ liệu được xử lý ở đâu**

- Bản ghi âm: chấm ngay trên iPhone bằng gói chấm điểm đã tải về máy, rồi bỏ; không gửi đi đâu.
- Video camera: chỉ xử lý trên thiết bị để đo khẩu hình; không lưu, không gửi đi.
- Kết quả chấm, hồ sơ người học, tiến độ bài học, lựa chọn giao diện, mục tiêu ngày: lưu trên thiết bị.
- Máy chấm riêng (tùy chọn, Cài đặt → Nâng cao): chỉ khi bạn tự kết nối, bản ghi âm và số đo khẩu hình (tám đặc trưng số và điểm viền môi) mới được gửi tới **máy chấm bạn tự chạy** trong cùng mạng (hoặc qua HTTPS do bạn cấu hình). Kết quả khi đó lưu trong tệp SQLite trên máy chấm đó.
- Gia sư AI: chỉ có trên máy chấm riêng, mặc định tắt. Khi bạn cấu hình nhà cung cấp và bấm nút, kết quả đã chấm (văn bản) hoặc **một ảnh miệng** được gửi tới nhà cung cấp đó theo điều khoản của họ.

**Tải gói chấm điểm và giọng mẫu**

- Lần đầu, ứng dụng tải gói chấm điểm (khoảng 357 MB) từ GitHub Releases. Như mọi lượt tải tệp, GitHub nhận địa chỉ IP của thiết bị; ứng dụng không gửi kèm thông tin nào khác.
- Giọng mẫu do AI của OpenAI tạo sẵn và đóng gói trong ứng dụng; ứng dụng không gửi gì tới OpenAI.

**Không có**: tài khoản, quảng cáo, telemetry, phân tích hành vi, chia sẻ với bên thứ ba.

**Quyền truy cập**: Camera và Micro (khi bạn luyện), Thông báo (nhắc luyện, tùy chọn, chỉ hỏi khi bạn bật), Mạng nội bộ (chỉ khi bạn kết nối máy chấm riêng).

**Xóa dữ liệu**: Cài đặt → Dữ liệu trên thiết bị → "Xóa dữ liệu trên thiết bị này" xóa kết quả, hồ sơ và tiến độ. Xóa ứng dụng sẽ xóa cả gói chấm điểm. Trên máy chấm riêng: xóa hồ sơ trong Cài đặt → Hồ sơ hoặc xóa tệp `data/coach.sqlite3`.

**Liên hệ**: qua trang GitHub của dự án.
