# Làm lại trải nghiệm di động — kế hoạch xử lý triệt để

Ngày 2026-10-18. Phản hồi của chủ dự án sau khi dùng trên iPhone: thao tác còn kiểu "click web", nhiều trang phải cuộn, Gương chỉ chấm khẩu hình mà chưa chấm phát âm.

## Đo hiện trạng (iPhone 390 × 844)

| Trang                    | Số màn hình | Nút < 44 px |
| ------------------------ | ----------- | ----------- |
| Trang chủ                | 3,1         | 3           |
| Luyện tập (danh sách)    | 4,6         | 2           |
| Bảng 44 âm / chi tiết âm | 4,6 / 5,3   | 6 / 8       |
| Tiến độ                  | 2,4         | 7           |
| Cài đặt                  | 3,9         | 22          |
| Lộ trình                 | 2,3         | 64          |

## Mẫu thiết kế áp dụng

| Nguồn                         | Mẫu                                                                                                                                      | Áp dụng                                                                             |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Apple HIG                     | Vùng chạm ≥ 44 pt; thanh tab cho điểm đến chính; sheet cho việc phụ; phản hồi tức thì khi chạm (highlight + haptic); không dựa vào hover | Nền tảng chạm toàn cục (giai đoạn 1)                                                |
| Duolingo, ELSA, Speak         | **Trình phát bài học toàn màn**: thanh tiến độ + nút đóng ở trên, một việc mỗi màn, nút hành động lớn ở dưới, ẩn thanh tab               | Luyện tập, Gương, Nghe, Hiệu chỉnh, Bài luyện âm (giai đoạn 2)                      |
| Duolingo "Path", ELSA "Today" | Trang chủ = **hôm nay**: chuỗi ngày, vòng mục tiêu, một thẻ "Tiếp tục" lớn, vài lối tắt; vừa một màn                                     | Trang chủ (giai đoạn 3)                                                             |
| ELSA, BoldVoice               | Chỉ tính "nắm được âm" khi **âm đúng**; khẩu hình là gợi ý hỗ trợ                                                                        | Gương: khẩu hình đúng **và** phát âm đúng, 3 lần liên tiếp = nắm được (giai đoạn 4) |
| iOS Settings, Danh bạ         | Danh sách dày, hàng 44–56 pt, chi tiết mở trong sheet thay vì trang dài                                                                  | 44 âm, danh sách luyện, lộ trình, tiến độ, cài đặt (giai đoạn 5)                    |

## Giai đoạn

1. **Nền tảng chạm**: tắt tô sáng khi chạm của WebKit, `touch-action: manipulation` (bỏ trễ chạm đúp), trạng thái nhấn (`:active` co nhẹ), hover chỉ khi thiết bị có chuột, vùng chạm ≥ 44 px, không chọn chữ trên nút, haptic nhẹ cho nút chính trong app iOS.
2. **Vỏ ứng dụng và trình phát bài học**: trên điện thoại bỏ thanh thương hiệu; trang tab có tiêu đề gọn; màn bài học chạy toàn màn với nút đóng và ẩn thanh tab.
3. **Trang chủ "Hôm nay"** vừa một màn.
4. **Gương có ghi âm**: nút mic trên camera, chấm âm đích + khẩu hình trong lúc nói, kết luận gộp, đếm 3 lần đạt liên tiếp.
5. **Danh sách gọn**: lưới 44 âm dày với sheet chi tiết; lộ trình dạng hàng đơn vị + sheet 5 bước; tiến độ và cài đặt dạng nhóm hàng kiểu iOS.
6. **Kiểm chứng**: đo lại bảng trên (mục tiêu: trang không phải danh sách ≤ 1,2 màn; 0 nút < 44 px), e2e, axe, ảnh chụp trước/sau, cài lên iPhone.
