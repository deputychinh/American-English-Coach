# American English Coach

Huấn luyện viên phát âm tiếng Anh Mỹ cho người Việt, chạy hoàn toàn trên máy của bạn: **gương khẩu hình** (camera, MediaPipe), **chấm âm vị** (wav2vec2 local), **trọng âm và ngữ điệu** (gợi ý), giao diện tiếng Việt. Không tài khoản, không API key, video không rời trình duyệt.

## Bắt đầu nhanh (macOS Apple Silicon)

Yêu cầu: Python 3.12 + [uv](https://docs.astral.sh/uv/), Node ≥ 24, giọng tiếng Anh Mỹ của macOS (`Samantha`).

```sh
make install     # repo tooling, backend (uv sync), web (npm install)
make models      # tải model âm vị (~1,2 GB) vào data/models và ghi checksum
make doctor      # kiểm tra Python, nội dung, CMUdict, model, `say`, cổng
make serve       # build web tĩnh + chạy API và web trên http://127.0.0.1:8765
```

Khi phát triển: `make api` (API :8765, reload) và `make web` (Next dev :3200, proxy `/api/v1`).

## Tính năng

- **Luyện phát âm AI**: chọn cặp tối thiểu theo lỗi phổ biến của người Việt (think/sink, she/see, vest/west, bad/bed, âm cuối…), câu kể/câu hỏi; ghi âm; nhận thẻ kết quả theo từng âm với ba mức `ok / check / error`, âm nghe được, gợi ý tiếng Việt.
- **Gương khẩu hình**: hiệu chỉnh 20 giây, thanh đo độ tròn môi/độ mở hàm/môi khép, gợi ý khi lệch; kết quả hình được ghép với âm theo mốc thời gian.
- **Trọng âm, ngữ điệu, nhịp**: so độ nổi bật âm tiết với trọng âm từ điển; hướng giọng cuối câu hỏi/câu kể; tỷ lệ dài âm nhấn/không nhấn. Chỉ ở mức gợi ý.
- **Bảng 44 âm IPA** với hướng dẫn khẩu hình tiếng Việt và từ mẫu; nghe giọng mẫu local.
- **Tiến độ do máy đo** theo từng âm, lịch sử lượt luyện, nút “Tôi nói đúng mà”.

## Riêng tư

API bind `127.0.0.1`. Trình duyệt chỉ gửi 6 đặc trưng miệng mỗi khung hình (không gửi video). Bản ghi âm không được lưu; kết quả nằm ở `data/coach.sqlite3`. Không telemetry.

## Giới hạn cần biết

- Camera **không thấy lưỡi**: /θ ð/ và phần lớn khác biệt nguyên âm dựa vào audio.
- Mức `error` chỉ bật cho lỗi đã đo precision ≥ 0,85 trên tập đánh giá (`content/enabled_errors.json`); các lỗi khác hiện `check`. Tập đánh giá hiện là speechocean762 (người nói Mandarin), chưa phải người Việt.
- Giọng mẫu là TTS của macOS, không phải người thật.
- Điện thoại: giao diện responsive, nhưng mở từ điện thoại qua mạng LAN cần HTTPS (chưa thiết lập).

## Lệnh

`make help` liệt kê: `install, models, doctor, api, web, build-web, serve, lint, format, test, test-legacy, bench, eval, openapi, e2e, ci, up, down`.

## Cấu trúc

```
backend/   FastAPI + domain + ML adapter (uv, ruff, mypy, pytest)
web/       Next.js static export (TS strict, ESLint, Stylelint, Vitest)
content/   nội dung tiếng Việt: 44 âm, catalogue lỗi, viseme, cặp tối thiểu, câu
vendor/    CMUdict, ipa-dict, thichhoc (giấy phép trong static/licenses của legacy)
legacy/    app stdlib cũ (vẫn chạy: cd legacy && python3 app.py)
docs/      plan, ADR, kiến trúc, quy ước, kiểm thử, benchmark, manifest dữ liệu
```

## Giấy phép dữ liệu và model

Xem `docs/DATA-MANIFEST.json`: wav2vec2-xlsr-53-espeak-cv-ft (Apache-2.0), MediaPipe Face Landmarker và tasks-vision (Apache-2.0), CMUdict (BSD), ipa-dict (MIT), speechocean762 (CC BY 4.0, chỉ dùng đánh giá), Noto Sans (OFL).
