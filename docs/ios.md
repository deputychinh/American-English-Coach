# Ứng dụng iOS

Ứng dụng iOS là **vỏ native Capacitor (Swift, WKWebView)** bọc đúng bản web đã kiểm chứng trong `web/`. Toàn bộ xử lý camera (MediaPipe WASM), thu âm (AudioWorklet → WAV 16 kHz) và giao diện chạy trong app; **máy chấm (API + model) chạy trên máy Mac** trong cùng mạng Wi‑Fi. Lý do: model wav2vec2 1,2 GB và pipeline chấm cần máy mạnh; điện thoại chỉ gửi WAV và các số đo khẩu hình (không gửi video).

## Chuẩn bị (một lần)

1. Xcode 26+ (đã cài tại `/Applications/Xcode.app`); không cần `sudo xcode-select`, Makefile tự trỏ `DEVELOPER_DIR`.
2. `make install` rồi `make ios-assets` (icon + splash sinh từ `web/public/icons/icon.svg`).

## Chạy trên simulator

```sh
make api              # máy chấm trên 127.0.0.1:8765 (simulator dùng chung mạng với Mac)
make ios-run          # build web → cap sync → xcodebuild → cài và mở app trên "iPhone 17"
```

Simulator không có camera; thu âm dùng micro của Mac. Gương khẩu hình chỉ kiểm tra được trên máy thật.

## Chạy trên iPhone thật

```sh
make api-lan          # API nghe trên 0.0.0.0:8765; lệnh in ra địa chỉ, ví dụ http://192.168.40.188:8765
make ios-open         # mở Xcode: chọn Team (Signing & Capabilities), chọn iPhone, bấm Run
```

Trong app: **Cài đặt → Địa chỉ máy chấm** nhập `192.168.40.188:8765` → "Lưu và kiểm tra", rồi **Ghép nối**: nhập mã 6 số mà `make api-lan` in ra trong log (`pairing code for phones on this network`). App nhận token và gửi kèm mọi yêu cầu (`X-Coach-Token`); máy Mac dùng trực tiếp không cần ghép nối. Địa chỉ được lưu trên máy; mọi lời gọi `/api/v1/*` (chấm, giọng mẫu, gia sư AI) đi tới máy Mac. Lần đầu iOS hỏi quyền Camera, Micro và Mạng nội bộ (chuỗi giải thích tiếng Việt trong `Info.plist`).

## Những gì nằm ở đâu

| Việc                                                                   | Nơi                                                                                          |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Cấu hình app (id `com.deputychinh.americanenglishcoach`, tên, webDir)  | `web/capacitor.config.ts`                                                                    |
| Project Xcode, Swift host (`AppDelegate.swift`, `SceneDelegate.swift`) | `web/ios/App/`                                                                               |
| Quyền và ATS (`NSAllowsLocalNetworking`)                               | `web/ios/App/App/Info.plist`                                                                 |
| Icon/splash nguồn                                                      | `web/assets/*.png` (sinh bởi `scripts/render-app-assets.mjs`)                                |
| Địa chỉ máy chấm lúc chạy                                              | `web/src/utils/api-base.util.ts` (localStorage `coach.apiBaseUrl`), UI trong `SettingsPanel` |
| CORS cho `capacitor://localhost` và địa chỉ LAN                        | `backend/app/config/settings.py` (`cors_origins`, `cors_origin_regex`)                       |

## Giới hạn hiện tại

- Chưa ký và phát hành TestFlight/App Store (cần Apple Developer Team của chủ dự án).
- HTTP trong mạng nội bộ (không TLS); không dùng ngoài mạng nhà/trường. Khi cần truy cập từ xa, đặt API sau HTTPS (Tailscale/Caddy) và nhập địa chỉ `https://…`.
- Service worker không chạy trong vỏ native (không cần: file đã đóng gói trong app).
