# Nhật ký thay đổi

Theo [Keep a Changelog](https://keepachangelog.com/vi/1.1.0/); phiên bản theo [SemVer](https://semver.org/lang/vi/). Phiên bản dùng chung cho API, web và app iOS.

## [Unreleased]

### Thêm

- Trải nghiệm di động làm lại (`docs/design/mobile-ux-overhaul.md`): chạm kiểu app (trạng thái nhấn, không trễ, vùng chạm 44 px, rung nhẹ trong app iOS); bỏ thanh thương hiệu trên điện thoại; trình phát bài học toàn màn có nút đóng cho Luyện tập, Nghe, Hiệu chỉnh, màn bắt đầu; trang chủ "Hôm nay" vừa một màn; danh sách dày với sheet cho 44 âm, lộ trình, khóa 14 ngày, cài đặt và tiến độ.
- Chấm nhanh hơn: máy chấm nạp sẵn mô hình, từ điển và bộ đo cao độ ngay khi khởi động, nên lần chấm đầu không còn chờ 6 giây; với một từ, app kết thúc lượt nói sau 0,45 giây im lặng thay vì 0,9 giây (câu giữ 0,75 giây để không cắt giữa chừng).
- Camera luyện tập bật sẵn; khung hình giữ đúng tỉ lệ camera nên đường viền môi và môi mẫu luôn nằm đúng miệng, khung nhỏ tự phóng to vào miệng khi thấy mặt; gợi ý "Đưa mặt vào khung" gọn một dòng.
- Giao diện tối: các nền nhấn dùng sắc độ trong suốt thay cho khối nâu đục; bảng 44 âm hiện ký hiệu IPA dạng chữ, chỉ thẻ đang chọn có màu.
- Lộ trình đủ 4 cấp × 24 đơn vị: cấp 2 "Rõ ràng" (nhịp, cụm phụ âm đầu/cuối, -ed, r/l, v/w/f, trọng tâm câu), cấp 3 "Tự nhiên" (schwa, nối âm, flap t, nguyên âm đôi, ɑ ɔ ɝ, trọng âm từ dài, ngữ điệu), cấp 4 "Thuần thục" (nhóm ý, nhấn tương phản, nói giảm, h ŋ j, shadowing, nói 1 phút); thêm 22 cặp tối thiểu, 26 câu và 12 lỗi thường gặp của người Việt.
- Kiểm tra trình độ 3 phút (`/placement/`, chạy offline): 12 câu nghe trải đều 4 cấp, xếp cấp bắt đầu và lưu trên máy; thẻ "Tiếp tục lộ trình" theo kết quả và hiện tiến độ cấp "Cấp N · x/6 đơn vị"; trang chủ ẩn banner máy chấm khi mọi thứ ổn, chỉ hiện khi có sự cố.
- Gương có "Nói thử": chấm âm đích và khẩu hình cùng lúc, 3 lần đúng liên tiếp mới tính là nắm được âm.

- Màn Gương làm lại cho điện thoại theo mẫu ứng dụng camera (`docs/design/mobile-mirror.md`): camera cạnh-sát-cạnh, "bóng mờ" mẫu môi căn theo miệng thật, vòng điểm khớp 0–100 % ba màu, một gợi ý chỉnh duy nhất bằng câu tự nhiên, chip trạng thái từng đặc trưng, chi tiết thu gọn, sheet chọn âm 44 âm có tìm kiếm; rung và âm báo khi giữ đúng. Hiệu chỉnh dùng cùng sân khấu camera. Trên điện thoại, màn camera ẩn header/footer; các màn khác bỏ footer (link chính sách nằm trong Cài đặt).
- Lộ trình phát âm chuẩn (`content/curriculum.json`, `GET /curriculum`, trang `/curriculum/`): cấp 1 với 6 đơn vị, mỗi đơn vị 5 bước (xem khẩu hình, nghe phân biệt, luyện có chấm, shadowing, hội thoại); tiến độ theo hồ sơ; nội dung được kiểm tra chéo với âm, cặp và câu khi khởi động.
- Bài nghe phân biệt (`/listen/?unit=…`, chạy offline): nghe chọn từ trong cặp tối thiểu, chọn âm tiết mạnh, chọn từ trọng tâm; phản hồi tức thì, tổng kết độ chính xác lưu trên máy và hiện ở bước 2 của đơn vị.
- Màn Luyện tập một màn hình: thanh trên gọn, câu/từ ở giữa (camera thu nhỏ có bóng mờ mẫu môi khi bật), nút thu tròn ở dưới với vòng mức âm; kết quả trượt lên dạng sheet với vòng điểm %, từng âm bấm xem chi tiết và nút Tiếp theo của bài luyện âm.
- App iOS: `make ios-device` build ký, cài và mở app trên iPhone thật với địa chỉ Mac nhúng sẵn; banner và lỗi 401 chỉ dẫn ghép nối bằng tiếng Việt; thẻ Ghép nối lên đầu Cài đặt trong vỏ native.

- Ngoại tuyến có kiểm soát: service worker phiên bản theo build id precache toàn bộ vỏ ứng dụng; nội dung bài, khóa học, kế hoạch, tiến độ, hiệu chỉnh và giọng mẫu được giữ lại theo hồ sơ nên vẫn xem được khi máy chấm không chạy; `/health`, `/ready` và chấm điểm không bao giờ qua cache. Unit test chạy `sw.js` trong `node:vm` và e2e `offline.spec.ts`.

### Sửa

- Máy chấm: hai lượt chấm đầu tiên chạy cùng lúc có thể lỗi "compilation disabled" của numba; lần biên dịch đầu giờ được tuần tự hóa.
- Gương: chạm nút mic đúng lúc lượt nói tự kết thúc không còn làm kẹt trạng thái "Đang nghe".

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

- POST tới máy chấm có địa chỉ (ghép nối, chấm, tạo hồ sơ) thất bại vì thân yêu cầu bị sao chép thành stream; giờ sao chép thành bytes. Phiên bản iOS lấy từ cấu hình project; Team ID ký đúng.

### Sửa

- Mốc thời gian trả về đúng UTC (`Z`), hiển thị đúng giờ Việt Nam.
- Image Docker: thêm Alembic, `httpx` là phụ thuộc chạy, torch bản CPU cho Linux.

## [1.0.0] - 2026-10-17

- Bản đầu: chấm 44 âm bằng wav2vec2 + GOP, gương khẩu hình MediaPipe, prosody, gia sư AI, ghép nối điện thoại, app iOS Capacitor.
