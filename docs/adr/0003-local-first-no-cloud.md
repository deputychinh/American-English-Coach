# ADR 0003: Local-first, không cloud, video không rời trình duyệt

- Trạng thái: chấp nhận · 2026-10-16 (kế thừa ràng buộc của PRODUCT-BRIEF §1)

## Bối cảnh

Người dùng là học sinh; dữ liệu là giọng nói và khuôn mặt (sinh trắc mức thấp). Chủ dự án yêu cầu chi phí gần 0 và không phụ thuộc dịch vụ trả phí. Azure Pronunciation Assessment cho điểm tốt hơn nhưng cần key, phí theo giờ và gửi audio ra ngoài.

## Quyết định

1. Mọi suy luận chạy trên máy người dùng: MediaPipe trong trình duyệt (WASM đóng gói trong `web/public/vendor/mediapipe/`), wav2vec2 trên MPS/CPU trong FastAPI, `say` của macOS cho giọng mẫu.
2. **Video không bao giờ rời trình duyệt.** Trình duyệt chỉ gửi vector đặc trưng miệng (6 số/khung, đã chuẩn hóa theo hiệu chỉnh cá nhân) kèm timestamp.
3. API bind `127.0.0.1`; CORS chỉ cho origin dev của web. Không telemetry, không request ra ngoài khi học (model và dataset tải khi `make models`/`make eval`).
4. Dữ liệu người học nằm ở `data/coach.sqlite3`; bản ghi âm không được lưu mặc định (chỉ kết quả JSON).
5. Nếu sau này cho phép chế độ cloud, nó phải là tùy chọn bật tay, có ADR riêng, và vẫn không gửi video.

## Hệ quả

- Chất lượng chấm phụ thuộc model mở; bù bằng ADR 0002.
- Dùng trên điện thoại cần HTTPS cho camera/mic; ngoài phạm vi 24h (ghi trong HANDOFF).
