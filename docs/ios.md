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
make ios-open         # mở Xcode: chọn iPhone ở thanh trên, bấm Run
```

Project đã đặt Team `9AVWS3MKNW` (ký tự động). Xcode cần Apple ID tương ứng đăng nhập một lần: **Xcode → Settings → Accounts → +**; thiếu bước này `xcodebuild` báo `No Account for Team`. Cắm iPhone qua cáp, mở khóa và bấm "Tin cậy"; lần đầu iPhone cần bật Developer Mode (Cài đặt → Quyền riêng tư & Bảo mật). Không cần mở Xcode:

```sh
xcrun devicectl list devices                              # lấy tên hoặc UDID của iPhone
make ios-device IOS_DEVICE=00008030-000178683C09802E      # build ký, cài và mở app trên máy
```

`make ios-device` nhúng sẵn địa chỉ LAN của Mac lúc build làm máy chấm mặc định của app (biến `NATIVE_API`, đọc qua `NEXT_PUBLIC_NATIVE_API_BASE_URL`), nên trên điện thoại chỉ còn bước Ghép nối; đổi mạng thì build lại hoặc sửa địa chỉ trong Cài đặt → Máy chấm.

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

Ngoài mạng nhà: xem [docs/remote-access.md](remote-access.md) (Tailscale hoặc Caddy, địa chỉ `https://`).

## Nhắc luyện

Cài đặt → "Mục tiêu và nhắc luyện" lên lịch một thông báo cục bộ lặp hằng ngày (`@capacitor/local-notifications`, id 1). Lần đầu iOS hỏi quyền thông báo; nếu từ chối, app chỉ dẫn bật lại trong Cài đặt hệ thống. Trên web nút này tắt và ghi rõ chỉ có trong ứng dụng iOS. Xuất hồ sơ trên iOS ghi tệp vào thư mục cache rồi mở bảng chia sẻ (`@capacitor/filesystem` + `@capacitor/share`).

## Giới hạn hiện tại

- Chưa ký và phát hành TestFlight/App Store (cần Apple Developer Team của chủ dự án).
- HTTP trong mạng nội bộ (không TLS); không dùng ngoài mạng nhà/trường. Khi cần truy cập từ xa, đặt API sau HTTPS (Tailscale/Caddy) và nhập địa chỉ `https://…`.
- Service worker không chạy trong vỏ native (không cần: file đã đóng gói trong app).
