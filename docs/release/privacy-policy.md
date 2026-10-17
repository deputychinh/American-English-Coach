# Chính sách quyền riêng tư — American English Coach

Cập nhật: 2026-10-17

**Ai vận hành**: ứng dụng và máy chấm là phần mềm bạn tự chạy. Không có máy chủ của nhà phát triển nhận dữ liệu của bạn.

**Dữ liệu được xử lý ở đâu**

- Video camera: chỉ xử lý trên thiết bị (trình duyệt hoặc app) để đo khẩu hình; không lưu, không gửi đi.
- Số đo khẩu hình (tám đặc trưng số và điểm viền môi) và bản ghi âm của lượt luyện: gửi tới **máy chấm bạn tự chạy** trên máy tính trong cùng mạng (hoặc qua HTTPS do bạn cấu hình). Bản ghi âm được chấm rồi bỏ; kết quả (điểm từng âm) lưu trong tệp SQLite trên máy chấm đó.
- Hồ sơ người học, lựa chọn giao diện, mục tiêu ngày: lưu trên thiết bị và trên máy chấm của bạn.
- Gia sư AI (tùy chọn, mặc định tắt): chỉ khi bạn cấu hình nhà cung cấp và bấm nút, ứng dụng gửi kết quả đã chấm (văn bản) hoặc **một ảnh miệng** tới nhà cung cấp đó theo điều khoản của họ.

**Không có**: tài khoản, quảng cáo, telemetry, phân tích hành vi, chia sẻ với bên thứ ba.

**Quyền truy cập**: Camera và Micro (chỉ khi bạn bật), Mạng nội bộ (để tới máy chấm), Thông báo (nhắc luyện, tùy chọn).

**Xóa dữ liệu**: Cài đặt → "Xóa dữ liệu trên thiết bị này"; trên máy chấm, xóa hồ sơ trong Cài đặt → Hồ sơ hoặc xóa tệp `data/coach.sqlite3`.

**Liên hệ**: qua trang GitHub của dự án.
