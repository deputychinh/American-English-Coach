# Web app cài lên màn hình chính

Bản web của American English Coach chạy được trên một máy chủ web tĩnh bất kỳ, không cần máy chấm. Người học mở trang, bấm "Thêm vào màn hình chính", rồi dùng như một app: toàn màn hình, có biểu tượng riêng, chạy cả khi không có mạng. Không cần App Store và không cần cài gì thêm.

Giống app iOS, bản web tự trả lời API của chính nó (nội dung, tiến độ, kế hoạch, hồ sơ lưu trong IndexedDB) và chấm phát âm ngay trong trình duyệt bằng ONNX Runtime Web. Giọng nói và hình ảnh không rời khỏi máy (ADR 0004). Thứ duy nhất tải về là gói chấm điểm (357 MB), tải một lần.

## Build

```bash
make vendor-web      # một lần: MediaPipe + ONNX Runtime Web vào web/public/vendor
make build-webapp    # → web/out-webapp (≈ 420 MB, phần lớn là gói chấm điểm)
make serve-webapp    # xem thử trên http://127.0.0.1:3300 với đúng header của host
```

`make build-webapp` làm các bước sau:

1. Build Next với `NEXT_PUBLIC_STANDALONE_WEB=1` vào `web/out-webapp`. Bản `web/out` mà máy chấm phục vụ không bị đụng tới.
2. Đóng dấu service worker theo build id.
3. Chia mô hình `w2v.mm8.onnx` thành 15 mảnh 24 MB trong `models/w2v.mm8/`, kèm `manifest.json` ghi SHA-256 của từng mảnh. Mô hình lấy từ `MODEL_PATH`, nếu không có thì lấy `data/models/onnx/w2v.mm8.onnx`, nếu vẫn không có thì tải bản release công khai (có kiểm tra checksum).
4. Ghi `_headers` theo định dạng của Cloudflare Pages và Netlify.

Chia mảnh để mọi host tĩnh đều phục vụ được (đa số giới hạn khoảng 25 MB mỗi file). Cách này còn giúp điện thoại tải tiếp từ mảnh đang dở khi mất sóng, và kiểm tra từng mảnh mà không cần giữ cả 357 MB trong bộ nhớ.

## Triển khai

Có thể dùng host tĩnh nào cũng được, miễn là có HTTPS. Trình duyệt chỉ cho dùng camera, micro, service worker và Cache Storage trên HTTPS (riêng `localhost` được coi là an toàn).

| Host             | Ghi chú                                                                                                                                |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Cloudflare Pages | Tải lên `web/out-webapp`. `_headers` được áp dụng, nên ONNX Runtime dùng được nhiều luồng.                                             |
| Netlify          | Như trên.                                                                                                                              |
| GitHub Pages     | Chạy được, nhưng không đặt được header. Trang không ở chế độ cross-origin isolated nên ONNX Runtime chỉ chạy 1 luồng và chấm chậm hơn. |
| nginx / Caddy    | Thêm các header bên dưới.                                                                                                              |

Header cần có. Nếu thiếu thì app vẫn chạy được nhưng chấm chậm hơn:

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

Muốn để gói chấm điểm trên CDN thay vì đặt cùng chỗ với app, build với `NEXT_PUBLIC_ENGINE_MODEL_BASE_URL=https://cdn…/w2v.mm8/`. CDN đó phải trả `Access-Control-Allow-Origin` và `Cross-Origin-Resource-Policy: cross-origin`. Link release trên GitHub không trả header CORS nên trình duyệt không tải được trực tiếp.

## Người học thấy gì

- **Trang chủ:**
  - Thẻ "Tải gói chấm điểm" có thanh tiến độ. Nếu tải bị ngắt, lần sau app tải tiếp từ chỗ dừng.
  - Thẻ "Cài app lên màn hình chính":
    - trên Android, Chrome và Edge có nút **Cài đặt** (hộp thoại cài của trình duyệt);
    - trên iPhone và iPad có ba bước qua nút Chia sẻ của Safari;
    - thẻ tự ẩn sau khi đã cài, hoặc khi người học bấm "Để sau".
- **Cài đặt → Chấm trên máy:** trạng thái gói, công tắc chấm trên máy và nút đo tốc độ (CPU).
- **Nghe mẫu:** app dùng giọng mẫu đóng gói sẵn nếu có, nếu không thì đọc bằng giọng tiếng Anh Mỹ của trình duyệt (Web Speech API, chạy trên máy).
- **Lối tắt** khi nhấn giữ biểu tượng app: Luyện tập, Từ vựng, Cách nói.

## Kiểm thử

- `make e2e-webapp` (cần chạy `make build-webapp` trước): Chromium tải thật 15 mảnh, chấm từ "think" bằng micro giả ngay trong trình duyệt, rồi ngắt mạng và chấm lại. Bài này cũng kiểm tra rằng không có request nào tới `/api/`, và kiểm tra thẻ cài đặt với user agent iPhone kèm axe.
- Unit test: kho mảnh mô hình (tải tiếp, mảnh hỏng, mảnh thiếu), engine qua worker giả, service worker (script worker giữ nguyên URL có `#params`, không cache `/models/`), thẻ cài đặt và giọng hệ thống.

Số đo trên Mac (Apple Silicon): mô hình chạy khoảng 2,1 giây cho 3 giây âm thanh với 1 luồng. Trong Chromium có 4 luồng, lần chấm đầu (gồm cả nạp mô hình) xong trong khoảng 2 giây.

## Giới hạn đã biết

- **iPhone chưa được thử trên máy thật.** Lúc nạp, mô hình chiếm khoảng 0,7–1,3 GB RAM, nên iPhone đời cũ có thể đóng tab. App iOS chạy native vẫn là lựa chọn chắc chắn hơn cho iPhone.
- Safari xóa dữ liệu của trang **chưa** được thêm vào màn hình chính sau khoảng 7 ngày không mở. Vì vậy nên cài app trước khi tải gói chấm điểm.
- Đường cao độ của câu mẫu (ngữ điệu) cần file âm thanh mẫu, nên không có khi app dùng giọng của trình duyệt.
- Gia sư AI (chụp khẩu hình gửi AI) không có trong bản web.
