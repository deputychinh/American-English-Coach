# ADR 0005: Góp ý nội dung bằng AI chỉ gửi chữ, chỉ khi chủ máy chấm bật

- Trạng thái: chấp nhận · 2026-10-24 (mở rộng ADR 0003 cho V6 của plan v2)

## Bối cảnh

Plan v2 §7 cần góp ý về **nội dung** người học nói ra: ngữ pháp, cách dùng từ, mức lịch sự. Việc này cần một mô hình ngôn ngữ. Máy chấm âm vị và cách đo độ trôi chảy chạy trên máy nhưng không hiểu nghĩa câu. ADR 0003 cho phép một chế độ cloud nếu nó là tùy chọn bật tay và có ADR riêng.

Lúc này máy chấm đã có gia sư AI (`COACH_LLM_*`). Gia sư chỉ được bật khi chủ máy chấm tự đặt nhà cung cấp và key. Apple Foundation Models (§10.3) chỉ có trên iPhone hỗ trợ Apple Intelligence và chưa đo được chất lượng.

## Quyết định

1. Góp ý nội dung đi qua gia sư AI sẵn có của máy chấm: `POST /api/v1/tutor/feedback`. Khi chưa cấu hình, route trả 503 và app hiện câu giải thích. App iOS và web app (chế độ trên máy) không gửi gì cả.
2. **Chỉ gửi chữ.** Người học gõ lại hoặc đọc chính tả điều đã nói. Nhận dạng giọng nói do trình duyệt hoặc hệ điều hành làm, và người học sửa được chữ trước khi gửi. Âm thanh không bao giờ rời máy vì việc này.
3. AI trả về JSON có cấu trúc `{grammar[], word_choice[], register, register_note_vi, better_version}`. Mỗi lượt app hiện **một** điểm cần sửa.
4. **AI không được nhận xét phát âm.** Prompt yêu cầu điều đó, và code lọc thêm bất kỳ mục nào có lời giải thích nói về phát âm, âm, trọng âm, ngữ điệu hoặc IPA. Bộ đánh giá đếm số lần AI vi phạm trong câu trả lời gốc, để biết khi prompt bị trôi.
5. Chất lượng được đo bằng `make eval-feedback`:
   - 50 câu kiểu người Việt, mỗi câu một lỗi đã gán nhãn, cộng 10 câu đúng (`backend/app/resources/feedback_eval.json`);
   - ngưỡng plan: precision ≥ 0,8;
   - một lỗi báo ra được tính là đúng nếu chỉ vào đúng chữ đã gán nhãn.

## Hệ quả

- Ngưỡng chất lượng chưa được đo: hai key cũ đã lộ phải thu hồi, và cần key mới mới chạy được `make eval-feedback`.
- Nhãn đánh giá do AI soạn, cần giáo viên xác nhận.
- Cách thử Foundation Models trên máy vẫn để ngỏ. Nếu làm, nó dùng chung định dạng JSON và bộ lọc này.
