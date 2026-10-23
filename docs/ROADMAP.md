# Lộ trình hoàn thiện — American English Coach

Trạng thái xuất phát (2026-10-17, `main` = `08f9903`): backend, web và app iOS đã chạy, CI xanh, 44 âm luyện được với camera. Tài liệu này là lộ trình đưa sản phẩm từ "chạy được" tới "hoàn thiện, phát hành được", theo thứ tự thực hiện. Mỗi hạng mục có tiêu chí nghiệm thu đo được; mã ticket trỏ về `docs/backlog.md`. Trạng thái: ☐ chưa · ◐ đang · ☑ xong.

Nguyên tắc không đổi: local-first (video không rời thiết bị), ba mức kết luận ok/check/error với cổng precision, mọi thay đổi có test và đi qua `make ci`, một commit Conventional Commit cho một hạng mục, làm trực tiếp trên `main`.

## Giai đoạn A — Dữ liệu người học (làm ngay)

| #   | Trạng thái | Hạng mục                                 | Tiêu chí nghiệm thu                                                                                                                                                                                                                                                                        |
| --- | ---------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A1  | ☑          | Hồ sơ nhiều người học (AEC-020)          | Bảng `profiles`, cột `profile_id` trên lượt chấm và hiệu chỉnh (migration 0003, DB cũ giữ nguyên dữ liệu trong hồ sơ `default`); header `X-Coach-Profile`; API tạo/đổi tên/xóa/xuất/nhập; Cài đặt có mục Hồ sơ; tiến độ, kế hoạch và hiệu chỉnh tách theo hồ sơ; test API + web + e2e      |
| A2  | ☑          | Lộ trình tuần và thẻ "Hôm nay" (AEC-021) | `GET /plan`: 7 ngày gần nhất, chuỗi ngày liên tiếp, mục tiêu/ngày, 3 trọng tâm có lý do (yếu / ôn lại / mới) tính từ dữ liệu đo; trang chủ và tiến độ hiển thị; mục tiêu ngày chỉnh trong Cài đặt; nhắc luyện hằng ngày trên iOS (thông báo cục bộ); test domain thuần cho bộ lập kế hoạch |
| A3  | ☑          | Mốc thời gian chuẩn UTC                  | `created_at` trả về có múi giờ (`Z`); web hiển thị đúng giờ Việt Nam; test                                                                                                                                                                                                                 |
| A4  | ☑          | Đồng bộ backlog                          | `docs/backlog.md` phản ánh đúng trạng thái P1 đã xong                                                                                                                                                                                                                                      |

## Giai đoạn B — Hoàn thiện trải nghiệm ứng dụng

| #   | Trạng thái | Hạng mục                      | Tiêu chí nghiệm thu                                                                                                                                     |
| --- | ---------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | ☑          | Onboarding lần đầu            | 3 bước: giới thiệu + quyền camera/mic, chọn/tạo hồ sơ, hiệu chỉnh 20 giây; chỉ hiện một lần; bỏ qua được; e2e                                           |
| B2  | ☑          | Song ngữ hoàn chỉnh (AEC-015) | `en.ts` đủ khóa (kiểm tra bằng test so khóa với `vi`); đổi ngôn ngữ trong Cài đặt, nhớ lựa chọn; không còn chuỗi cứng trong component/service           |
| B3  | ☑          | Tiếp cận (a11y) và chữ lớn    | Kiểm tra VoiceOver/axe trên 7 trang; hỗ trợ Dynamic Type (rem-based, đo 200 % trên 11 trang: không tràn, không cắt chữ); báo cáo lưu `docs/lighthouse/` |
| B4  | ☑          | Ngoại tuyến có kiểm soát      | Service worker cache vỏ ứng dụng + nội dung bài; trạng thái "không có máy chấm" vẫn xem bài, gương và lịch sử đã tải; test                              |

### Bổ sung sau 1.1.0 — trải nghiệm điện thoại

| #   | Trạng thái | Hạng mục                          | Tiêu chí nghiệm thu                                                                                                                                                   |
| --- | ---------- | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E1  | ☑          | Gương khẩu hình kiểu camera       | Camera toàn màn, bóng mờ mẫu môi căn theo miệng, vòng điểm khớp + một gợi ý, chip đặc trưng, sheet chọn âm; unit + e2e; thiết kế trong `docs/design/mobile-mirror.md` |
| E2  | ☑          | Chạy trên iPhone thật             | `make ios-device` cài và mở app; địa chỉ Mac nhúng sẵn; ghép nối hoạt động (sửa lỗi POST qua địa chỉ máy chấm)                                                        |
| E3  | ☐          | Màn Luyện tập và kết quả kiểu app | Thẻ kết quả từng âm theo mẫu BoldVoice (điểm tổng, bấm từ xem âm), nút thu âm giữ-để-nói, phản hồi khẩu hình gộp với âm                                               |
| E4  | ☐          | Trang chủ và điều hướng           | Bỏ hero kiểu web, lời chào + mục tiêu ngày + "luyện tiếp" một chạm; tiêu đề lớn theo iOS                                                                              |

## Giai đoạn C — Chất lượng chấm và nội dung

| #   | Trạng thái | Hạng mục                              | Tiêu chí nghiệm thu                                                                                                                                                                                  |
| --- | ---------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | ☑          | Bộ công cụ pilot người Việt (AEC-023) | `make pilot`: thu thập bản ghi có đồng ý (từ lượt chấm được gắn cờ), bảng chấm tay CSV, script tính precision/recall theo lỗi và sinh `enabled_errors.json` khi precision ≥ 0,85; tài liệu quy trình |
| C2  | ☑          | Giọng mẫu chất lượng cao (AEC-022)    | Lớp `ReferenceVoice` chọn giọng theo thứ tự: clip người thật có giấy phép (nếu có trong `content/voice/`) → giọng hệ thống nâng cao; manifest giấy phép; phát trên iOS                               |
| C3  | ☑          | Bài học có cấu trúc                   | Khóa 14 ngày cho người Việt (âm cuối, th, cặp nguyên âm dài/ngắn, trọng âm, ngữ điệu); mỗi ngày 10–15 phút, nối với kế hoạch tuần; nội dung trong `content/course.json` có test tính hợp lệ          |

## Giai đoạn D — Phát hành

| #   | Trạng thái | Hạng mục                           | Tiêu chí nghiệm thu                                                                                                                                                        |
| --- | ---------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | ☑          | HTTPS cho máy chấm từ xa (AEC-025) | Hướng dẫn Caddy và Tailscale; app chấp nhận `https://`; CORS cho origin https; kiểm tra tay                                                                                |
| D2  | ☑          | Hồ sơ phát hành iOS (AEC-024)      | `docs/release/`: checklist TestFlight, văn bản App Store (vi/en), chính sách riêng tư, kích cỡ ảnh chụp, bump version/build theo tag; ký thật cần Apple Team của chủ dự án |
| D3  | ☑          | Đóng gói Docker đã kiểm chứng      | `make up` build và chạy được, `/ready` xanh trong container                                                                                                                |
| D4  | ☑          | Phiên bản và nhật ký thay đổi      | `CHANGELOG.md` theo Keep a Changelog; tag `v1.1.0` khi A–B xong                                                                                                            |

## Ngoài phạm vi tự làm (cần chủ dự án)

- Thu hồi và cấp lại hai API key (Kimi, OpenAI) đã dán trong chat; cập nhật `.env`.
- Chạy trên iPhone thật (camera, ghép nối Wi‑Fi), ký TestFlight với Apple Team.
- Dữ liệu pilot: người Việt thu âm có đồng ý và người chấm độc lập (công cụ ở C1 đã sẵn).
- Giấy phép clip giọng người thật (C2 có chỗ cắm sẵn).

## Giai đoạn V — Từ vựng và cách nói chuyện (plan v2)

Chi tiết, nguồn và quyết định cần chốt: [`docs/PLAN-V2-SPEAKING-AND-VOCABULARY.md`](PLAN-V2-SPEAKING-AND-VOCABULARY.md).

| #   | Trạng thái | Hạng mục                                           | Tiêu chí nghiệm thu                                                                     |
| --- | ---------- | -------------------------------------------------- | --------------------------------------------------------------------------------------- |
| V1  | ☑          | Lõi ôn giãn cách FSRS trên máy                     | ☑ `srs.util.ts` + unit test; dùng trong màn Từ vựng                                     |
| V2  | ◐          | Kho thẻ IndexedDB, kho từ theo đơn vị, tab Từ vựng | ☐ ≥ 120 mục cấp 1 đã duyệt (có 45, 93 từ chờ duyệt); ☑ e2e 10 thẻ + chấm nói; ☑ offline |
| V3  | ☑          | Cụm giao tiếp theo chức năng và cấu trúc nói       | ☑ Mỗi đơn vị ≥ 1 chức năng và 1 mẫu câu; ☑ chấm đuôi -s/-ed bằng máy chấm âm vị; ☑ e2e  |
| V4  | ☐          | Độ trôi chảy và bài Nói 3 lần                      | Tốc độ nói, đoạn nói liền, ngắt nghỉ đo trên máy; chỉ so với chính người học            |
| V5  | ☐          | Phiên "Hôm nay 15 phút" gộp mọi mạch               | e2e hành trình; tiếp tục đúng chỗ                                                       |
| V6  | ☐          | Phản hồi nội dung bằng AI (v1.1)                   | Precision ≥ 0,8 trên 50 câu có lỗi gán nhãn; AI không nêu lỗi phát âm                   |
