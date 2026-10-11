# Kiểm chứng bản local — 2026-10-11

## Kết quả tự động

- `python3 -m unittest discover -s tests -q`: **33 bài đạt**, 13,353 giây trong lượt kiểm tra cuối backend.
- `node --test tests/lexicon-view.test.mjs`: **2 bài đạt**.
- `node --check static/app.js`: đạt.
- Không thêm dependency Python; runtime chỉ dùng standard library.

Các bài kiểm tra bao gồm nhập đủ 466.550 mục, bảng 44 âm, lọc âm, phân trang, truy vấn chứa ký tự SQL, nghĩa Việt, biến thể geese → goose, giữ trọng âm IPA `about`, đa phát âm, nguồn dữ liệu/nhãn thiếu, đầu vào sai, tiến độ sau mở lại, chống submit trùng, lịch ôn, sao lưu/khôi phục, token localhost và chặn nguồn truy cập khác. Hai tiến trình đồng thời xây chỉ mục cũng được kiểm tra: mỗi tiến trình dùng tệp tạm riêng rồi thay thế nguyên tử.

Kiểm thử giao diện helper xác nhận tô đúng âm, hỗ trợ /i/ và /iː/, không chèn HTML từ dữ liệu từ điển và hiển thị nhãn dịch máy.

## Kiểm tra trình duyệt

Thực hiện trên hồ sơ dữ liệu kiểm thử riêng ở cổng 8766, không sửa tiến độ chính cổng 8765.

- Tìm `about`: thấy `/əˈbaʊt/`, nghĩa Việt, mở thêm các nghĩa/từ loại.
- Trang âm /iː/: từ mẫu `see` hiển thị phiên âm cả từ `/ˈsi/` và nghĩa “nhìn thấy”.
- Tìm `seat` trong nhóm /iː/: thấy “chỗ ngồi”, tô ký hiệu /i/ trong phiên âm.
- Font Noto Sans đóng gói local được tải thành công; cỡ IPA kết quả 25px → 34px khi bấm phóng lớn, giữ lựa chọn sau tải lại.
- Ở cửa sổ hẹp 500 CSS px, viewport giả lập điện thoại 390×844 và desktop: không tràn ngang trang sau chỉnh bố cục. Chưa kiểm chứng trên thiết bị điện thoại thật.
- Thu thử qua MediaRecorder bằng luồng âm thanh tổng hợp trong bộ kiểm thử, lưu WebM, tải lại HTTP 200 (1.448.394 byte), track dừng sau ghi. Đã xóa đúng bản ghi tổng hợp này. Không dùng kiểm thử đó để kết luận chất lượng micro thực tế hay chấm accent.
- Không thấy lỗi console ở lượt kiểm tra giao diện cuối.
- Audio mẫu được tạo bằng macOS `say`, cache WAV. Bộ audio khởi đầu đã tạo 295 tệp; từ mới được tạo khi cần.

## Dữ liệu và giới hạn

Chỉ mục hiện tại: 466.550 mục, 72.072 mục có IPA/CMU, 115.655 mục có nghĩa Việt. Tổng 155.259 bản ghi nghĩa/từ loại trong chỉ mục nguồn (gồm 120 mục bài học); đây không phải số từ dwyl được dịch.

Nghĩa thichhoc là dịch máy chưa kiểm duyệt, có thể sai. Không cam kết phủ toàn bộ từ, xác minh toàn bộ nghĩa/khẩu hình, đo chất lượng TTS bằng người đánh giá, tự chấm phát âm hay đạt trình độ tiếng Anh trong 90 ngày. Chưa đo phần trăm code coverage; số bài kiểm thử không được coi là tỷ lệ coverage.
