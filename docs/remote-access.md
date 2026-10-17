# Máy chấm từ xa qua HTTPS

Mặc định máy chấm chỉ nghe trên `127.0.0.1` (một mình trên máy) hoặc `0.0.0.0` trong mạng Wi‑Fi nhà (`make api-lan`, có ghép nối bằng mã 6 số). Khi người học ở ngoài mạng nhà (điện thoại dùng 4G, máy chấm ở nhà), có hai cách an toàn, không cần mở cổng router.

Ứng dụng chấp nhận địa chỉ `https://…` ở **Cài đặt → Địa chỉ máy chấm** (`normaliseBaseUrl` giữ nguyên scheme); iOS cho phép `https` theo mặc định của App Transport Security, `http` chỉ được phép trong mạng nội bộ (`NSAllowsLocalNetworking`). Ghép nối thiết bị vẫn bắt buộc với mọi client không phải loopback.

## Cách 1 — Tailscale (khuyên dùng, 5 phút)

1. Cài Tailscale trên Mac và trên iPhone, đăng nhập cùng tài khoản.
2. Trên Mac bật HTTPS cho máy chấm bằng `tailscale serve` (Tailscale tự cấp chứng chỉ cho tên máy `*.ts.net`):

   ```sh
   make api            # API vẫn chỉ nghe 127.0.0.1:8765
   tailscale serve --bg https / http://127.0.0.1:8765
   tailscale serve status   # in ra https://<ten-may>.<tailnet>.ts.net
   ```

3. Trong app nhập `https://<ten-may>.<tailnet>.ts.net` vào Địa chỉ máy chấm → "Lưu và kiểm tra" → Ghép nối bằng mã trong log API (`COACH_PAIRING_CODE` cố định trong `.env` nếu muốn mã không đổi).

Chỉ thiết bị trong tailnet của bạn thấy máy chấm; không có cổng nào mở ra Internet. Kết nối tới máy chấm qua Tailscale đến từ địa chỉ `100.x.y.z` (không phải loopback) nên vẫn phải ghép nối.

## Cách 2 — Caddy với tên miền riêng

Khi có tên miền và một máy luôn bật (Mac mini, VPS), Caddy tự lấy chứng chỉ Let's Encrypt:

```caddyfile
# /etc/caddy/Caddyfile
coach.example.com {
    reverse_proxy 127.0.0.1:8765
    encode zstd gzip
    header {
        Strict-Transport-Security "max-age=31536000"
        X-Content-Type-Options nosniff
        Referrer-Policy strict-origin-when-cross-origin
    }
}
```

```sh
make build-web && make serve      # API phục vụ cả web/out trên 127.0.0.1:8765
sudo caddy run --config /etc/caddy/Caddyfile
```

Cổng 80/443 phải tới được máy chạy Caddy (mở trên router hoặc dùng VPS + `ssh -R`). Bật `COACH_PAIRING_CODE` cố định và giữ `COACH_TUTOR_RATE_LIMIT_PER_MINUTE` mặc định; cân nhắc thêm `basic_auth` của Caddy cho `/api/docs`.

## CORS và nguồn gốc

- Mở web ngay từ máy chấm (`https://coach.example.com/`) là cùng nguồn gốc → không cần CORS.
- App iOS có nguồn gốc `capacitor://localhost` → đã nằm trong `COACH_CORS_ORIGINS`.
- Chỉ khi chạy giao diện dev (`next dev` ở máy khác) qua HTTPS mới cần thêm nguồn gốc đó vào `COACH_CORS_ORIGINS` (danh sách JSON trong `.env`).

## Kiểm tra

```sh
curl -s https://<dia-chi>/api/v1/ready           # {"status":"ready",...}
curl -s -o /dev/null -w '%{http_code}\n' https://<dia-chi>/api/v1/progress   # 401: chưa ghép nối (đúng)
```

Trong app: Cài đặt → Lưu và kiểm tra phải báo "Kết nối được"; sau ghép nối, Trang chủ hiển thị kế hoạch tuần.
