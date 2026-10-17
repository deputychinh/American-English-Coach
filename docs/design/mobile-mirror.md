# Thiết kế lại cho điện thoại — Gương khẩu hình và phản hồi "đúng hay chưa"

Mục tiêu: app iOS trông và dùng như ứng dụng camera chuyên nghiệp, không như trang web; người học biết **ngay lập tức** khẩu hình đã đúng chưa và **phải chỉnh gì**.

## Học từ các app nổi tiếng

| App / mẫu                                    | Điều học được                                                                                             | Áp dụng                                                                                    |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| ELSA Speak                                   | Mã màu xanh / vàng / đỏ cho đúng – gần đúng – sai; mỗi lần chỉ một lỗi chính; video khẩu hình mẫu           | Ba trạng thái màu cho vòng điểm; một gợi ý chỉnh duy nhất; mẫu môi đè lên video             |
| BoldVoice                                    | Điểm tổng % ngay sau khi nói, bấm vào từ để xem từng âm; video HLV chỉ vị trí lưỡi                          | Điểm khớp % theo thời gian thực; chip từng đặc trưng mở ra chi tiết                        |
| App chỉnh tư thế (Posture Sense, Skeletal PT) | Khung xương **mẫu** đè lên khung xương **của bạn**; đổi sang xanh khi đạt; cue bằng rung và giọng           | "Bóng mờ" mẫu môi căn theo vị trí miệng thật; viền môi đổi xanh; rung + âm báo khi giữ đủ   |
| Camera iOS / TikTok                          | Khung hình chiếm toàn màn, điều khiển nổi trên video, nút chính ở giữa dưới, không tiêu đề trang           | Màn gương không header/footer, camera cạnh-sát-cạnh, vòng điểm ở giữa dưới, chọn âm bằng sheet |

## Màn Gương (điện thoại)

```
┌──────────────────────────────┐
│ [/uː/ · food ▾]        🔇  ↻ │  ← chip âm (mở sheet chọn âm), tắt âm báo, hiệu chỉnh lại
│                              │
│        video (gương)         │
│      ┌─ ─ ─ ─ ─ ─ ─ ┐        │  ← bóng mờ mẫu môi căn theo miệng thật
│      │  viền môi bạn │        │  ← viền môi đổi xanh khi khớp
│      └─ ─ ─ ─ ─ ─ ─ ┘        │
│   [ Chu môi tròn hơn ↑ ]     │  ← một gợi ý duy nhất, hiện sau 0,5 s lệch
│          ( 82 % )            │  ← vòng điểm khớp: xám / vàng / xanh, đầy dần khi giữ
│         Giữ nguyên…          │
├──────────────────────────────┤
│ ● Độ tròn môi  ● Độ rộng ▲   │  ← chip từng đặc trưng (xanh = trong vùng, vàng + mũi tên = chỉnh)
│ ▸ Chi tiết: mẹo, lỗi hay gặp, thanh đo, hỏi gia sư │
└──────────────────────────────┘
```

- Camera tự bật khi đã hiệu chỉnh; nút tạm dừng nổi trên video.
- Điểm khớp 0–100 % (`mouth-match.util.ts`): mỗi đặc trưng đích cho điểm 1 khi trong vùng, giảm tuyến tính theo khoảng lệch (dung sai 0,25); điểm tổng là trung bình. Màu: xanh khi mọi đặc trưng trong vùng, vàng khi ≥ 60 %, xám khi thấp hơn hoặc chưa thấy mặt — không dùng đỏ để không làm nản.
- "Đúng rồi" khi giữ đủ `hold_ms` của nhóm âm: vòng đầy, rung `success` (iOS) và âm báo (tắt được).
- Gợi ý là câu hành động tự nhiên ("Chu môi tròn hơn", "Đưa đầu lưỡi ra giữa hai hàm răng"), không phải tên biến + mũi tên.
- Chọn âm: sheet trượt từ dưới, 44 âm nhóm nguyên âm / phụ âm, có tìm kiếm, nhãn độ tin cậy camera.

## Màn Hiệu chỉnh

Cùng `CameraStage`: lời nhắc bước hiện to trên video, vòng tiến trình, chấm bước; nút Bắt đầu / Tiếp tục ở dưới.

## Vỏ ứng dụng trên điện thoại

- Màn Gương và Hiệu chỉnh ở chế độ "toàn màn": ẩn header thương hiệu và footer, nội dung sát mép; vẫn giữ thanh tab.
- Các màn khác: bỏ footer trên điện thoại (chính sách riêng tư nằm trong Cài đặt), header chỉ còn logo + tên ngắn.
- Vùng an toàn (tai thỏ, thanh home) dùng `--safe-top` / `--safe-bottom` ở mọi lớp nổi.

## Kiểm chứng

- Unit: điểm khớp và gợi ý (`mouth-match.util.test.ts`), MirrorGuide (trạng thái, chip, gợi ý), CameraStage (vị trí bóng mờ theo viền môi).
- e2e: hành trình gương/hiệu chỉnh cập nhật selector; axe trên hai màn.
- Chụp màn hình 390 px trước/sau trong `docs/screenshots/`.
