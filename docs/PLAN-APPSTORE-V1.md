# Plan phát hành App Store v1.0: từ "công cụ trên Mac" thành app chuyên nghiệp tự chạy trên iPhone

Ngày 20/10/2026. Plan này kế thừa và thay phần kiến trúc của `PLAN-RELEASE-100K.md`. Phần giáo trình 4 cấp × 24 đơn vị của plan đó vẫn giữ.

## 0. Tóm tắt một trang

**Vấn đề chặn phát hành:**

1. **App không tự chạy.** Chấm điểm và giọng mẫu cần máy chấm chạy trên Mac của chủ dự án. Hướng dẫn App Store 4.2.3(i) ghi: _"Your app should work on its own without requiring installation of another app to function."_ Người tải từ App Store không có máy chấm, nên app hiện tại sẽ bị từ chối.
2. **Giọng mẫu không phát hành được.** Thư viện giọng người thật đang rỗng. "Nghe mẫu" do lệnh `say` của macOS tạo ra; máy chủ Linux không có lệnh này, và không được phân phối âm thanh đó trong app thương mại.
3. **Bài học chưa thành một trải nghiệm liền mạch.** Mỗi đơn vị là một danh sách link. Bước "có hướng dẫn" chưa có shadowing ngữ điệu, bước "giao tiếp" mới chỉ là đề bài dạng chữ.

**Hướng giải quyết đề xuất (cần chủ dự án duyệt, xem mục 6):**

- **Chấm điểm ngay trên iPhone.** Chuyển mô hình wav2vec2 sang ONNX, chạy bằng ONNX Runtime native qua một plugin Capacitor. Logic chấm (căn chỉnh, GOP, luật biến thể, danh mục lỗi người Việt) chuyển sang TypeScript, có test đối chiếu từng kết quả với bản Python.
  - Đo ngày 20/10: bản nén MatMul int8 nặng 356 MB, chấm 3 giây âm thanh mất 0,35 s trên một nhân M4 Pro.
  - 51/58 từ cho chuỗi âm giống hệt bản gốc. Bản fp32 giống 58/58.
- **Giọng mẫu đóng gói sẵn trong app**, có giấy phép thương mại, 4 giọng Mỹ (nam/nữ, trẻ/lớn) để luyện nghe nhiều giọng (HVPT).
- **v1.0 miễn phí, không tài khoản, không có dữ liệu nào rời máy.** Như vậy không cần Sign in with Apple, không cần chức năng xóa tài khoản, nhãn quyền riêng tư là "Data Not Collected", và không tốn chi phí máy chủ. Gói Pro, hội thoại AI và đồng bộ để sang v1.1.
- **Trình chạy bài học 5 bước** theo khung Celce-Murcia/Hancock, kèm luyện nghe nhiều giọng, shadowing có đường nét ngữ điệu và nhập vai theo kịch bản.

## 1. Nền tảng sư phạm và cách mỗi điều trở thành tính năng

| Nguồn                                                                                                                             | Điều rút ra                                                                                                                                                            | Tính năng trong v1.0                                                                                                                                    |
| --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Munro & Derwing (1995, 2006); Derwing, Munro & Wiebe (1998)                                                                       | Mục tiêu là **dễ hiểu**, không phải giống người bản ngữ. Lỗi có tải chức năng cao và lỗi đầu từ ảnh hưởng nhiều hơn; dạy ngữ điệu, trọng âm cải thiện lời nói tự do.   | Điểm hiển thị là "dễ hiểu" chứ không phải "giống người Mỹ". Thứ tự âm theo tải chức năng × tần suất lỗi người Việt. Mỗi cấp có bài trọng âm/ngữ điệu.   |
| Gilbert, _Clear Speech_ / Prosody Pyramid                                                                                         | Nhóm ý → từ trọng tâm → âm tiết trọng âm → nguyên âm đỉnh.                                                                                                             | Bài "chạm từ trọng tâm" và "chia nhóm ý"; shadowing hiện đường nét cao độ và vạch nhóm ý.                                                               |
| Cook, _American Accent Training_                                                                                                  | Ngữ điệu bậc thang, nối âm, giảm âm; luyện theo đoạn dài dần.                                                                                                          | Hình bậc thang trên câu mẫu; bài nối âm và giảm âm (cấp 3); shadowing tăng dần độ dài.                                                                  |
| Mojsin, _Mastering the American Accent_                                                                                           | Miệng → âm → trọng âm từ → trọng âm câu → ngữ điệu → nối âm; mỗi âm có lỗi theo tiếng mẹ đẻ.                                                                           | Thẻ âm có "lỗi người Việt hay mắc"; hình miệng và lưỡi (mặt cắt dọc) cho cả 44 âm.                                                                      |
| Hancock, _English Pronunciation in Use_; Baker, _Ship or Sheep?_                                                                  | Nghe phân biệt → giải thích ngắn → luyện có kiểm soát → luyện tự do; cặp tối thiểu là xương sống.                                                                      | Bắt buộc nghe phân biệt trước khi nói; ngân hàng cặp tối thiểu theo âm.                                                                                 |
| Celce-Murcia, Brinton & Goodwin, _Teaching Pronunciation_                                                                         | Năm giai đoạn: mô tả → nghe phân biệt → có kiểm soát → có hướng dẫn → giao tiếp.                                                                                       | **Trình chạy bài học** đi đủ 5 bước trong 10–15 phút, có thanh tiến độ, lưu được giữa chừng.                                                            |
| HVPT: Uchihara, Karas & Thomson, meta-analysis 79 nghiên cứu (SSLA 2025) và 31 nghiên cứu về nói (Applied Psycholinguistics 2024) | Luyện nghe với **nhiều giọng, nhiều ngữ cảnh, có phản hồi**: hiệu quả nghe trung bình tới lớn (g = 0,92); chuyển sang nói khiêm tốn, chủ yếu trên từ đã luyện.         | Bài nghe dùng 4 giọng và từ khác nhau mỗi lượt, phản hồi ngay. Luôn ghép luyện nói có phản hồi; không quảng cáo "nghe là nói được".                     |
| Nghiên cứu lỗi người Việt (CTU 2019, Đồng Nai, Phan Thiết, Trà Vinh 2025)                                                         | Phụ âm cuối và cụm phụ âm (rụng, chèn nguyên âm, mất hữu thanh, không bật), /s/ số nhiều và ngôi ba, nhầm hữu thanh/vô thanh cuối, trọng âm và ngữ điệu do thanh điệu. | Danh mục lỗi hiện có (rụng âm cuối, chèn âm, /θ ð ʃ/, /ɪ–iː/, /æ–e/, /v–w/) là thứ tự ưu tiên; thêm phát hiện chèn nguyên âm sau phụ âm cuối ("bookə"). |
| Kết quả `make sweep` (19/10)                                                                                                      | Máy chấm báo nhầm 16,1% với giọng chuẩn; 6 âm yếu (/ʊ ʌ ɔɪ f k tʃ/).                                                                                                   | Giữ nhãn độ tin cậy; v1.0 chỉ chấm "đạt / gần đúng / chưa đúng", không điểm lẻ, không xếp hạng gây áp lực.                                              |

**Điều app sẽ không hứa:** "giọng Mỹ chuẩn trong 30 ngày", điểm IELTS, hay chẩn đoán y khoa. Lời giới thiệu trên App Store bám vào điều đo được: nghe phân biệt tốt hơn, phát âm dễ hiểu hơn.

## 2. Kiến trúc v1.0

```
iPhone (không cần mạng sau lần tải đầu)
├─ Vỏ Capacitor (Swift)
│  ├─ Plugin PhonemeEngine: ONNX Runtime (CPU, thử CoreML/ANE) → log-posterior theo khung
│  ├─ Thông báo cục bộ (nhắc luyện), Haptics, StatusBar, SplashScreen
│  └─ Tải mô hình lần đầu (≈360 MB, báo dung lượng và hỏi trước, theo 4.2.3(ii)), kiểm SHA-256
├─ Web app (Next.js static export)
│  ├─ scoring/ (TypeScript, mới): từ điển CMUdict, chọn biến thể, căn chỉnh, GOP (CTC forced alignment),
│  │   luật biến thể, danh mục lỗi người Việt, gộp khẩu hình. Test vàng đối chiếu bản Python.
│  ├─ prosody/ (TypeScript): YIN cao độ, năng lượng, nhóm ý → đường nét cho shadowing
│  ├─ Gương khẩu hình MediaPipe (đã có, trên thiết bị)
│  ├─ Nội dung + giọng mẫu đóng gói (≈4 giọng × ~1 000 câu/từ, AAC 48 kbps ≈ 60–90 MB)
│  └─ Tiến độ, kế hoạch tuần, ôn giãn cách: lưu trên máy (IndexedDB), xuất/nhập file
└─ Chế độ "máy chấm riêng" (đã có) giữ cho lớp học/dev, ẩn sau Cài đặt → Nâng cao
```

Backend FastAPI vẫn là **bản chuẩn để đối chiếu và công cụ dữ liệu** (sweep, speechocean, pilot, dựng nội dung). App phát hành không phụ thuộc vào nó.

## 3. Hạng mục, thứ tự và nghiệm thu

Mỗi hạng mục: nhánh/commit theo Conventional Commits, `make ci` xanh, e2e chế độ điện thoại, ảnh chụp SE + iPhone 15 cho mọi màn bị đổi.

### Giai đoạn A: app tự chạy (bắt buộc để phát hành)

| #   | Hạng mục                                 | Việc                                                                                                                                                                                              | Nghiệm thu                                                                                                                                               |
| --- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A0  | Spike chấm trên iPhone (cổng quyết định) | Plugin Capacitor tối thiểu chạy `w2v.mm8.onnx` trên iPhone thật; đo CPU và CoreML.                                                                                                                | Chấm 3 s âm thanh ≤ 1,5 s trên iPhone của chủ dự án; RAM đỉnh < 1 GB; không crash 50 lần liên tiếp. Không đạt thì chuyển phương án B (cloud, mục 6).     |
| A1  | Cổng chất lượng mô hình nén              | Chạy `make sweep` và speechocean với log-posterior từ bản nén.                                                                                                                                    | Báo nhầm giọng chuẩn ≤ bản gốc + 1 điểm %; tỉ lệ bắt lỗi speechocean ≥ bản gốc − 1 điểm %. Không đạt thì dùng fp16 (632 MB).                             |
| A2  | Máy chấm TypeScript                      | Chuyển `assessment_service`, `gop`, aligner, chọn biến thể, `verdict`, danh mục lỗi, fusion sang `web/src/scoring/`; từ điển CMUdict nén.                                                         | Test vàng: với log-posterior và đầu vào giống nhau, 100% verdict từng âm khớp bản Python trên 880 lượt sweep + 250 câu speechocean. Unit coverage ≥ 90%. |
| A3  | Ngữ điệu TypeScript                      | YIN cao độ, năng lượng, trọng âm câu, lên/xuống cuối câu.                                                                                                                                         | Sai lệch so với bản Python (pYIN) trên bộ câu: trung vị < 1 nửa cung; nhận định lên/xuống khớp ≥ 95%.                                                    |
| A4  | Tải mô hình lần đầu                      | Màn tải có dung lượng, tiến độ, tạm dừng/tiếp tục, chỉ qua Wi-Fi nếu muốn; kiểm SHA-256; lưu trong Application Support (không iCloud backup).                                                     | Mất mạng giữa chừng tiếp tục được; mô hình hỏng tự tải lại; trong lúc tải vẫn dùng được nghe, gương, bảng âm.                                            |
| A5  | Giọng mẫu đóng gói                       | Dựng toàn bộ câu/từ/cặp (~1 000 mục) × 4 giọng Mỹ có giấy phép thương mại, chuẩn hóa âm lượng (−16 LUFS), cắt im lặng; manifest có checksum; ghi rõ nguồn giọng (AI) trong app và trang riêng tư. | 100% mục nội dung có đủ 4 giọng; e2e "Nghe mẫu" chạy offline; không còn gọi `say`.                                                                       |
| A6  | Lưu trữ trên máy                         | Kết quả, tiến độ, hiệu chỉnh, kế hoạch tuần, ôn giãn cách chuyển sang IndexedDB (mã hóa không cần); xuất/nhập file JSON (`aec-profile/2`).                                                        | Gỡ máy chấm vẫn đủ: trang chủ, lộ trình, tiến độ, kế hoạch; dữ liệu cũ từ máy chấm riêng nhập được.                                                      |
| A7  | Chế độ máy chấm riêng thành "Nâng cao"   | Cài đặt bình thường không còn địa chỉ máy chủ/ghép nối; mục Nâng cao bật chế độ lớp học.                                                                                                          | Người mới không bao giờ thấy chữ "máy chấm", "ghép nối", "địa chỉ".                                                                                      |

### Giai đoạn B: trải nghiệm học chuyên nghiệp

| #   | Hạng mục                                    | Việc                                                                                                                                                                                                                                | Nghiệm thu                                                                                                                     |
| --- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| B1  | Trình chạy bài học 5 bước                   | Một màn toàn màn hình đi tuần tự: mô tả (hình miệng + 3 từ khóa) → nghe phân biệt → luyện có kiểm soát (từ → cặp → câu, đạt 2/3 mới qua) → có hướng dẫn (shadowing) → giao tiếp (nhập vai). Thanh tiến độ, thoát/tiếp tục đúng chỗ. | Đi hết một đơn vị ≤ 15 phút không phải quay về danh sách; e2e hành trình đủ 5 bước; tiếp tục đúng bước sau khi tắt app.        |
| B2  | Luyện nghe nhiều giọng (HVPT)               | Mỗi lượt nghe chọn ngẫu nhiên giọng và từ khác trong cặp; phản hồi ngay kèm phát lại cả hai từ; theo dõi độ chính xác theo âm; dừng khi đạt 85% hai phiên liền.                                                                     | Bộ đề không lặp giọng–từ liền nhau; độ chính xác nghe theo âm hiện trong Tiến độ và quyết định ôn tập.                         |
| B3  | Shadowing có đường nét ngữ điệu             | Câu mẫu hiện đường nét cao độ, bậc thang và vạch nhóm ý; người học nói theo, chồng đường nét của mình lên; nhận xét 3 mức (trọng âm câu, lên/xuống cuối câu, tốc độ).                                                               | Hai đường nét cùng trục thời gian (căn theo âm tiết); hiển thị đúng ở SE; a11y có mô tả chữ thay hình.                         |
| B4  | Nhập vai theo kịch bản (giao tiếp, offline) | 24 hội thoại ngắn (một cho mỗi đơn vị), mỗi hội thoại 4–6 lượt; app đọc vai kia bằng giọng mẫu, người học nói vai mình và được chấm từ mục tiêu.                                                                                    | Mỗi đơn vị có hội thoại dùng ≥ 3 từ mục tiêu; chấm được từng lượt; điểm danh dùng đúng âm mục tiêu.                            |
| B5  | Hình miệng và lưỡi cho 44 âm                | Hình SVG mặt cắt dọc (môi, răng, lưỡi, ngạc) + hình nhìn thẳng; nguyên âm đôi có hai khung chuyển động.                                                                                                                             | Đủ 44 âm; hiện ở bước mô tả, thẻ âm và sheet chi tiết.                                                                         |
| B6  | Phát hiện chèn nguyên âm sau phụ âm cuối    | Thêm lỗi `final_epenthesis` (book → "bookə") vào danh mục: nhận chèn schwa sau phụ âm cuối từ căn chỉnh.                                                                                                                            | Bộ thử tổng hợp ("bookə", "stopə", "fishə") bắt ≥ 80%; không tăng báo nhầm trên sweep quá 0,5 điểm %.                          |
| B7  | Kế hoạch hằng ngày và nhắc luyện            | "Hôm nay 12 phút" một chạm; thông báo cục bộ theo giờ người học chọn; chuỗi ngày có ngày nghỉ được phép (không phạt nặng).                                                                                                          | Nhắc luyện đúng giờ cả khi app đóng; tắt được trong Cài đặt; không xin quyền thông báo trước khi người học hoàn thành bài đầu. |
| B8  | Kiểm tra đầu vào có phần nói                | Thêm 8 câu đọc vào bài kiểm tra 3 phút hiện có; xếp cấp theo cả nghe và nói; tạo "3 âm ưu tiên".                                                                                                                                    | Người mới đi từ mở app đến bài đầu ≤ 3 phút; kết quả đầu vào giải thích bằng câu dễ hiểu.                                      |

### Giai đoạn C: chất lượng sản phẩm

| #   | Hạng mục  | Nghiệm thu                                                                                                                                                    |
| --- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | Hiệu năng | Mở app nguội ≤ 2 s trên iPhone 12; chấm từ ≤ 1,5 s; không giật khi bật gương (nhận diện khuôn mặt chuyển sang Web Worker để không làm trễ thu âm).            |
| C2  | Truy cập  | VoiceOver đọc đúng mọi nút và kết quả; Dynamic Type tới cỡ XL không vỡ bố cục; tương phản AA; có tùy chọn giảm chuyển động.                                   |
| C3  | Ổn định   | Crash log cục bộ (không gửi đi); 0 lỗi console ở mọi màn trong e2e; test lại toàn bộ trên iPhone thật theo danh sách kiểm (docs/release/device-checklist.md). |
| C4  | Ngôn ngữ  | Giao diện tiếng Việt mặc định, tiếng Anh đầy đủ; không chuỗi cứng; mô tả App Store hai ngôn ngữ.                                                              |
| C5  | iPad      | v1.0 chỉ iPhone (đặt `TARGETED_DEVICE_FAMILY = 1`) để không phải làm ảnh chụp và bố cục iPad; iPad sang v1.1.                                                 |

### Giai đoạn D: tuân thủ và phát hành

| #   | Hạng mục          | Nghiệm thu                                                                                                                                                                                                                                            |
| --- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Quyền riêng tư    | Chuỗi xin quyền micro/camera bằng tiếng Việt nói rõ mục đích; chỉ báo đang thu (đỏ + rung) theo 2.5.14; trang riêng tư cập nhật: "mọi xử lý trên máy, không thu dữ liệu"; `PrivacyInfo.xcprivacy` khai đúng API; nhãn App Store "Data Not Collected". |
| D2  | AI và bên thứ ba  | v1.0 không gửi gì cho AI bên thứ ba. Gia sư AI ẩn trong bản phát hành; nếu bật ở v1.1 phải có màn xin phép rõ theo 5.1.2(i).                                                                                                                          |
| D3  | Tài sản App Store | Biểu tượng, 6 ảnh chụp 6,9" + 6,5" (vi, en), video xem trước 20 s, mô tả, từ khóa, URL hỗ trợ và riêng tư (trang tĩnh), độ tuổi 4+.                                                                                                                   |
| D4  | Ký, TestFlight    | Apple Developer Program (99 USD/năm, tên tổ chức/cá nhân), App ID, provisioning; TestFlight nội bộ → 20–50 người thử ngoài 1 tuần; sửa lỗi theo phản hồi.                                                                                             |
| D5  | Nộp duyệt         | Ghi chú cho người duyệt: app chạy hoàn toàn trên máy, không cần tài khoản; mô hình tải lần đầu ≈ 360 MB (đã báo trước). Phát hành theo giai đoạn (phased release).                                                                                    |

### Sau v1.0 (v1.1+, không chặn phát hành)

- Gói Pro (StoreKit 2).
- Hội thoại AI thời gian thực với máy chủ và tài khoản: Sign in with Apple, xóa tài khoản trong app, xin phép gửi giọng cho AI.
- Đồng bộ iCloud, iPad, ngưỡng chấm theo âm từ pilot người Việt (AEC-028), gia sư AI giải thích lỗi.

## 4. Lịch dự kiến

| Tuần | Việc                                                                                | Điểm kiểm                                                     |
| ---- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| 1    | A0 spike trên iPhone thật, A1 cổng chất lượng, bắt đầu A2 (căn chỉnh, GOP, verdict) | **Cổng A0/A1**: chủ dự án xem số đo, chốt on-device hay cloud |
| 2    | A2 xong (test vàng), A3, A5 dựng giọng mẫu, A6                                      | App chấm offline trên iPhone                                  |
| 3    | A4, A7, B1 trình chạy bài học, B2 HVPT                                              | Bản TestFlight nội bộ đầu tiên                                |
| 4    | B3 shadowing, B4 nhập vai, B5 hình miệng, B7 nhắc luyện                             |                                                               |
| 5    | B6, B8, C1–C4                                                                       | TestFlight ngoài (20–50 người)                                |
| 6    | Sửa theo phản hồi, D1–D5                                                            | Nộp App Store                                                 |

## 5. Rủi ro và cách giảm

| Rủi ro                                    | Mức        | Giảm thiểu                                                                                                               |
| ----------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------ |
| Mô hình quá chậm/nặng trên iPhone cũ      | Trung bình | Cổng A0; CoreML/ANE; yêu cầu tối thiểu iPhone 12 / iOS 16; phương án B cloud.                                            |
| Bản nén đổi kết quả chấm                  | Trung bình | Cổng A1 bằng sweep + speechocean; dự phòng fp16.                                                                         |
| Chuyển máy chấm sang TypeScript sai lệch  | Cao        | Test vàng từng âm trên 1 130 mẫu trước khi bỏ bản Python khỏi đường chấm.                                                |
| Dung lượng app (mô hình + giọng)          | Thấp       | Mô hình tải lần đầu, không nằm trong gói; giọng mẫu AAC; báo dung lượng trước.                                           |
| Bị từ chối vì "minimum functionality"     | Thấp       | App đủ chức năng offline; có gương khẩu hình và luyện nghe nhiều giọng mà app khác không có.                             |
| Giấy phép giọng mẫu                       | Trung bình | Chỉ dùng nhà cung cấp cho phép phân phối thương mại; ghi rõ "giọng AI" trong app (yêu cầu tiết lộ của nhà cung cấp TTS). |
| Máy chấm vẫn báo nhầm 16% với giọng chuẩn | Trung bình | Giữ 3 mức + nhãn độ tin cậy; "gần đúng" không phạt; pilot người Việt để hiệu chỉnh theo âm (v1.1).                       |

## 6. Quyết định cần chủ dự án chốt

1. **Chấm điểm**: trên iPhone (đề xuất) hay cloud.
   - Trên iPhone: miễn phí vận hành, riêng tư, chạy offline, không cần tài khoản; người dùng tải mô hình ≈ 360 MB lần đầu.
   - Cloud: app nhẹ, nhưng cần máy chủ GPU (ước ~1 000 USD/ngày nếu dùng Azure ở quy mô 100 000 người), tài khoản, xóa tài khoản, và xin phép gửi giọng.
   - Quyết định ngày 17/10 chọn cloud cho chấm âm. Plan này đề xuất đổi, vì số đo ngày 20/10 cho thấy chạy trên máy khả thi.
2. **Nguồn giọng mẫu**: TTS có giấy phép thương mại (đề xuất: OpenAI `gpt-4o-mini-tts` hoặc Azure Neural, 4 giọng Mỹ, chi phí dựng một lần vài USD, phải ghi "giọng AI") hay thu giọng người thật (tốt nhất, nhưng tốn thời gian và chi phí).
3. **Mô hình kinh doanh v1.0**: miễn phí hoàn toàn (đề xuất, duyệt nhanh, chưa cần máy chủ) hay có gói Pro ngay.
4. **Tài khoản Apple Developer** để ký phát hành: đứng tên cá nhân hay tổ chức. App hiện ký bằng Team nào cần xác nhận lại.

## 7. Quyết định đã chốt (20/10/2026, chủ dự án)

- **Chấm điểm trên iPhone** (ONNX Runtime native). Cloud chỉ là phương án dự phòng nếu không qua cổng A0/A1.
- **Giọng mẫu: TTS OpenAI**, đóng gói sẵn trong app, ghi rõ "giọng AI". Cần một API key OpenAI mới (key cũ đã lộ trong chat).
- **v1.0 miễn phí hoàn toàn**, không tài khoản.
- **Chưa có Apple Developer Program trả phí**: chủ dự án đăng ký trước tuần 3 để kịp TestFlight. Đến lúc đó vẫn cài lên iPhone bằng chứng chỉ phát triển hiện có.

## 8. Nhật ký thực hiện

### A1 · Cổng chất lượng mô hình nén: **ĐẠT** (20/10)

`COACH_RECOGNIZER=onnx` (mô hình `w2v.mm8.onnx`, 356 MB, SHA-256 trong `data/models/onnx/manifest.json`):

| Chỉ số                                   | PyTorch | ONNX nén | Cổng    |
| ---------------------------------------- | ------- | -------- | ------- |
| Báo nhầm giọng chuẩn (`make sweep`, 880) | 16,1%   | 15,7%    | ≤ 17,1% |
| speechocean: báo nhầm âm đúng            | 12,3%   | 11,9%    |         |
| speechocean: bắt âm sai                  | 43,6%   | 43,3%    | ≥ 42,6% |
| speechocean: tương quan Pearson          | 0,474   | 0,476    |         |

### A2 · Máy chấm TypeScript: **XONG** (20/10)

- `web/src/utils/{ctc,aligner,gop,phoneme,lexicon,score-verdict,error-catalog,viseme}.util.ts` và `features/scoring/services/local-assessment.service.ts` trả cùng `AssessmentResponse` như API.
- Test vàng: 58 câu thật (từ, câu, thay âm cố ý với danh mục lỗi bật hết, khung khẩu hình đúng và lệch). **58/58 khớp từng âm** với bản Python.
- Dữ liệu chấm (`web/src/data/scoring`) do `backend/scripts/build_scoring_data.py` sinh ra; có test báo khi dữ liệu cũ.
- Cài đặt → "Dùng chấm trên máy khi luyện tập" chạy mô hình native rồi chấm bằng TypeScript, không cần mạng.

### A3 · Ngữ điệu TypeScript: **XONG** (20/10)

- Bộ phân tích (trọng âm từ, ngữ điệu cuối câu, nhịp) khớp chính xác 12/12 câu thật khi dùng chung track.
- Năng lượng khớp librosa đến 5 chữ số thập phân.
- YIN thay pYIN: 97,9% khung chung lệch < nửa cung, **25/25 nhận định khớp** (cổng: ≥ 90% và ≥ 95%).

### A6 · Chạy không cần máy chủ: **XONG** (20/10)

- "Máy chủ cục bộ" trong client API (`features/offline`):
  - Nội dung tĩnh lấy từ bản chụp do backend xuất (`build_content_snapshot.py`, có test báo khi cũ).
  - Lượt chấm lưu trong IndexedDB.
  - Tiến độ, kế hoạch tuần (planner chuyển sang TypeScript), lộ trình, khóa học, hồ sơ và xuất/nhập `aec-profile/1` đều tính trên máy.
- Bật tự động trong app iOS khi mô hình đã tải và người học không chọn máy chấm riêng.
- e2e chặn mọi request `/api/v1` mà mọi màn vẫn chạy.

### A4 · Tải mô hình lần đầu: **XONG** (20/10)

- Mô hình đặt trên GitHub Release `model-v1` (công khai, kèm NOTICE Apache-2.0). Tải lại từ link công khai rồi kiểm SHA-256: khớp; mất 41 s qua mạng gia đình.
- Thẻ "Tải gói chấm điểm (357 MB)" trên Trang chủ và trong Cài đặt: nêu dung lượng trước khi tải (4.2.3(ii)), có tiến độ, hủy, thử lại.
- Trạng thái tải dùng chung giữa các màn; việc tải tiếp tục khi chuyển màn.

### A7 · Máy chấm riêng thành "Nâng cao": **XONG** (20/10)

- App iOS chạy cục bộ ngay từ lần mở đầu: nội dung, tiến độ và gương không cần máy chủ; chỉ chấm điểm mới cần gói.
- Cài đặt: "Chấm trên máy" nằm trong nhóm Học tập; địa chỉ máy chủ và ghép nối nằm trong "Nâng cao → Máy chấm riêng".

### A0 · Plugin chấm trên máy: đang làm

- Plugin `web/plugins/phoneme-engine` (Swift, ONNX Runtime 1.24.2 qua SPM) đã build được cho simulator.
- Plugin có các chức năng: tải mô hình có kiểm SHA-256 và loại khỏi iCloud backup; nạp mô hình bằng CPU hoặc CoreML; trả log-posterior; benchmark.
- Cài đặt → "Chấm trên máy (thử nghiệm)" tải mô hình từ máy chấm đã ghép nối (`/api/v1/models`) rồi đo tốc độ.
- Còn chờ số đo trên iPhone thật.
