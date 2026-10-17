# Giọng mẫu người thật

Thư mục này chứa clip giọng người bản xứ **có giấy phép** cho từ và câu luyện. Khi có clip khớp văn bản, máy chấm phát clip thay cho giọng tổng hợp (`say`); khi không có, giọng tổng hợp vẫn dùng như trước (`app/ml/voice_library.py`).

`manifest.json` là danh sách, mỗi phần tử:

```json
{
  "text": "think",
  "file": "think-us-f1.wav",
  "speaker": "F1 (General American, nữ, 30s)",
  "source": "https://…",
  "license": "CC BY 4.0",
  "attribution": "Tên tác giả"
}
```

Quy ước: WAV mono 16 kHz (`ffmpeg -i in.wav -ac 1 -ar 16000 out.wav`), văn bản khớp chính xác sau khi chuẩn hóa (chữ thường, bỏ dấu câu cuối). Không thêm clip không rõ giấy phép; clip có giấy phép ShareAlike hoặc NonCommercial phải được ghi rõ để quyết định phát hành.
