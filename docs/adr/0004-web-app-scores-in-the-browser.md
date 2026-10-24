# ADR 0004: Web app chấm phát âm ngay trong trình duyệt

- Trạng thái: chấp nhận · 2026-10-24 (mở rộng ADR 0003 cho bản web cài lên màn hình chính)

## Bối cảnh

Chủ dự án muốn có bản web mà người học "thêm vào màn hình chính" được, không phải cài từ App Store. Trước đây bản web luôn cần một máy chấm (FastAPI trên Mac) và chỉ app iOS chấm được ngay trên máy (ONNX Runtime native, plan A4/A6). Để có một web app công khai thì có hai cách:

1. Đặt máy chấm trên cloud. Cách này gửi giọng nói ra khỏi máy, trái ADR 0003, tốn chi phí chạy máy chủ, và phải có tài khoản cùng chính sách dữ liệu.
2. Chạy chính mô hình đó trong trình duyệt bằng ONNX Runtime Web (WASM).

Bản thử ngày 2026-10-24 cho kết quả: `w2v.mm8.onnx` (wav2vec2 XLSR-53 lượng tử int8, 357 MB) chạy được trên WASM với ONNX Runtime Web 1.30.0. Mất khoảng 2,1 giây cho 3 giây âm thanh với 1 luồng trên Mac, và nhanh hơn khi trang ở chế độ cross-origin isolated với 4 luồng.

## Quyết định

1. Chọn cách 2. Web app (`make build-webapp`) là một bản export tĩnh, chạy theo cùng chế độ local như app iOS:
   - API được trả lời ngay trong app;
   - dữ liệu người học nằm trong IndexedDB;
   - âm được chấm bằng `PhonemeEngine`, plugin iOS trong app native và ONNX Runtime Web trong một Web Worker trên web.
     Cùng một bộ chấm TypeScript nhận posteriors từ cả hai đường.
2. Mô hình được chia thành mảnh 24 MB có SHA-256 riêng, lưu trong Cache Storage `aec-model-w2v.mm8`. Bộ nhớ đệm này tách khỏi các cache `coach-*` mà service worker xóa ở mỗi lần deploy.
3. Kết quả chấm trên web ghi `model_version = "w2v.mm8@web"`, để không trộn với `@ios` khi so sánh.
4. Host nên trả COOP/COEP để ONNX Runtime dùng được nhiều luồng. Nếu thiếu, app vẫn chạy với 1 luồng.
5. Không có thành phần cloud nào được thêm vào. Không có tài khoản, không có telemetry. Giọng nói và hình ảnh không rời khỏi trình duyệt.

## Hệ quả

- Người học phải tải 357 MB một lần trước khi được chấm. Trong lúc chờ, họ vẫn nghe, soi gương và học bài được.
- Trên iPhone, lúc nạp mô hình chiếm khoảng 0,7–1,3 GB RAM, chưa thử trên máy thật. App iOS native vẫn là đường chính cho iPhone.
- Safari xóa dữ liệu của trang chưa được cài sau khoảng 7 ngày, nên thẻ trên trang chủ khuyên người học cài app trước.
- Service worker phải trả script worker dưới dạng response mới, không gắn URL, vì bootstrap worker của Turbopack đọc cấu hình từ phần `#params=` của URL.
