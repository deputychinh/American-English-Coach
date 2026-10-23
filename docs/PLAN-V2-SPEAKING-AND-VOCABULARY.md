# Plan v2: từ app phát âm thành app học nói tiếng Anh đầy đủ

Ngày 23/10/2026 · Trạng thái: **đề xuất, cần chủ dự án duyệt mục 10**.

Plan này kế thừa `PLAN-APPSTORE-V1.md`. Mọi quyết định đã chốt ở đó vẫn giữ: chấm điểm trên iPhone, v1.0 miễn phí, không tài khoản, không dữ liệu nào rời máy, AI cloud để sang v1.1. Các con số dưới đây là **mục tiêu cần đo**, không phải kết quả đã đạt.

## 0. Tóm tắt một trang

**Vấn đề:** app hiện dạy rất tốt **cách phát âm**, gồm 44 âm, trọng âm, ngữ điệu, nối âm, gương khẩu hình và chấm từng âm trên máy. Nhưng người học còn cần ba thứ mà app chưa có:

1. **Nhớ và dùng được từ vựng.** App chưa có kho từ cần học hay lịch ôn. (App cũ trong `legacy/` có 120 thẻ từ, bản mới chưa mang sang.)
2. **Nói trôi chảy, tự nhiên, đúng ngữ cảnh.** Tức là tốc độ, ngắt nghỉ, cụm từ có sẵn, cách mở lời, đồng ý, hỏi lại, lịch sự hay thân mật.
3. **Dùng đúng cấu trúc khi nói.** Thì quá khứ, câu hỏi, đuôi -s/-ed trong lời nói thật, chứ không phải ngữ pháp trên giấy.

**Hướng đi:** giữ 24 đơn vị hiện có làm xương sống. Mỗi đơn vị đã có sẵn một chủ đề hội thoại (giới thiệu bản thân, gia đình, gọi đồ uống…). Gắn thêm vào mỗi đơn vị **bốn mạch mới**: từ vựng, cụm từ giao tiếp, cấu trúc nói và độ trôi chảy. Thêm một **bộ ôn giãn cách FSRS** chạy trên máy cho mọi thứ cần nhớ, gồm từ, cụm từ và âm yếu.

**Điểm khác biệt so với app học từ thông thường:** người học **nói** từ ra để nhớ, và máy chấm âm vị hiện có xác nhận nói đúng chưa. Thẻ từ không dừng ở việc lật thẻ để xem nghĩa.

**Sáu mạch kỹ năng sau v2:**

| Mạch                                               | Hiện có                           | v2 thêm                                               |
| -------------------------------------------------- | --------------------------------- | ----------------------------------------------------- |
| Phát âm (âm, trọng âm, ngữ điệu, nối âm)           | ☑ 24 đơn vị, chấm trên máy, gương | Ôn âm yếu bằng FSRS thay luật 3/7/21 ngày             |
| Nghe                                               | ◐ HVPT, nghe phân biệt            | Nghe chép câu tốc độ thật, nghe hiểu hội thoại        |
| **Từ vựng và cụm từ**                              | ☐                                 | Kho ~1 500 mục theo chủ đề, 4 kiểu ôn, nói để nhớ     |
| **Cách nói chuyện** (chức năng giao tiếp, lịch sự) | ◐ nhập vai 6 lượt                 | Cụm giao tiếp theo chức năng, chọn câu hợp ngữ cảnh   |
| **Cấu trúc nói**                                   | ☐                                 | 24 mẫu câu nói, luyện biến đổi câu bằng giọng         |
| **Độ trôi chảy**                                   | ☐                                 | Đo tốc độ, độ dài đoạn nói liền, ngắt nghỉ; bài 4/3/2 |

**Thứ tự làm:** V1 lõi ôn FSRS → V2 kho từ và màn Từ vựng → V3 mạch cụm giao tiếp và cấu trúc → V4 độ trôi chảy → V5 phiên học hằng ngày gộp mọi mạch → V6 phản hồi nội dung bằng AI (v1.1). Ước lượng 8–12 tuần cho một người, cần chỉnh sau V2.

---

## 1. Hiện trạng (đối chiếu mã nguồn ngày 23/10)

| Thành phần                                                    | Vị trí                                                  | Tái dùng cho v2                          |
| ------------------------------------------------------------- | ------------------------------------------------------- | ---------------------------------------- |
| Giáo trình 4 cấp × 24 đơn vị, 5 bước/đơn vị, hội thoại 6 lượt | `content/curriculum.json`                               | Gắn thêm mạch mới theo `unit.id`         |
| Máy chấm âm vị trên máy (ONNX + TypeScript)                   | `web/src/features/scoring`, `web/src/utils/gop.util.ts` | Chấm từ và cụm từ khi người học nói      |
| Ngữ điệu, trọng âm, nhịp                                      | `web/src/utils/prosody.util.ts`                         | Chấm câu trong bài cấu trúc và trôi chảy |
| VAD theo thời gian âm thanh                                   | `web/src/utils/vad.util.ts`                             | Đo ngắt nghỉ, đoạn nói liền              |
| Kế hoạch tuần, chuỗi ngày, nhắc luyện                         | `web/src/utils/planner.util.ts`                         | Phiên học hằng ngày (V5)                 |
| Lưu lượt chấm trên máy (IndexedDB)                            | `web/src/utils/local-store.util.ts`                     | Thêm kho thẻ ôn, nâng DB lên phiên bản 2 |
| Từ điển 466 550 mục, IPA, nghĩa Việt (thichhoc, dịch máy)     | `vendor/`, `legacy/coach/lexicon.py`                    | Nguồn IPA và nghĩa nháp cho kho từ       |
| Giọng mẫu TTS đóng gói sẵn                                    | `content/voice/`                                        | Thêm audio cho từ và câu ví dụ           |

---

## 2. Nền tảng sư phạm và cách mỗi điều thành tính năng

| Nguồn                                                            | Điều rút ra                                                                                                                                                       | Thành tính năng                                                                         |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Thuật toán FSRS (Open Spaced Repetition, mặc định của Anki)      | Mô hình trí nhớ ba biến: độ khó, độ ổn định, xác suất nhớ. Lịch ôn đặt theo **tỷ lệ nhớ mục tiêu**, không theo khoảng cố định. Tham số tối ưu được từ lịch sử ôn. | Một bộ lập lịch cho mọi thẻ; người học chỉnh tỷ lệ nhớ 85–95 %                          |
| Hiệu ứng truy xuất (retrieval practice)                          | Tự nhớ lại khó nhưng nhớ lâu hơn nhìn lại đáp án                                                                                                                  | Thẻ hỏi trước, đáp án sau; ưu tiên kiểu **nói ra** hơn kiểu chọn                        |
| NGSL-Spoken 1.2 (Browne & Culligan)                              | 721 từ phủ khoảng 90 % lời nói tự nhiên không soạn trước; giấy phép CC BY-SA 4.0                                                                                  | Lõi kho từ cấp 1–2. Từ học ít mà nghe và nói được nhiều                                 |
| NGSL 1.2                                                         | 2 809 từ chung                                                                                                                                                    | Nguồn chọn từ cho cấp 3–4                                                               |
| Cụm từ cố định (formulaic sequences)                             | Nói trôi chảy nhờ lấy cả cụm từ trí nhớ, giảm tải trí nhớ làm việc; người dùng nhiều cụm được đánh giá là giỏi hơn                                                | Kho có **cụm** (“Could you say that again?”, “I'm not sure, but…”), không chỉ từ đơn    |
| Các chỉ số trôi chảy (de Jong; Suzuki 2021; SpeechRater của ETS) | Tốc độ nói, độ dài đoạn nói liền (mean length of run) và tần suất ngắt nghỉ tương quan mạnh với trình độ                                                          | Ba chỉ số đo trên máy, hiển thị theo xu hướng, **không quy ra điểm trình độ**           |
| Kỹ thuật 4/3/2 (Nation)                                          | Nói lại cùng nội dung với thời gian ngắn dần thì tăng độ trôi chảy                                                                                                | Bài “Nói 3 lần”: 60 → 45 → 30 giây                                                      |
| Celce-Murcia (đã dùng ở v1)                                      | Mô tả → nhận biết → có kiểm soát → có hướng dẫn → giao tiếp                                                                                                       | Dùng cùng khung 5 bước cho mạch cụm từ và cấu trúc                                      |
| Lỗi người Việt (CTU, VJOL, Đồng Nai)                             | Rụng -s/-ed, rụng âm cuối                                                                                                                                         | Mạch cấu trúc nhấn **ngữ pháp có âm**: -s ngôi ba, -ed, số nhiều, chấm bằng máy chấm âm |

---

## 3. Cấu trúc sản phẩm

### 3.1 Điều hướng (5 tab, giữ quy ước iOS hiện có)

| Tab         | Nội dung                                                                                             |
| ----------- | ---------------------------------------------------------------------------------------------------- |
| **Hôm nay** | Một nút “Bắt đầu 15 phút”: thẻ đến hạn → bước tiếp của đơn vị → một bài nói. Chuỗi ngày, mục tiêu    |
| **Học**     | Lộ trình 24 đơn vị như hiện tại; mỗi đơn vị có thêm mạch Từ vựng, Cụm giao tiếp, Cấu trúc, Trôi chảy |
| **Từ vựng** | Số thẻ đến hạn, kho từ đã học, tìm từ, thêm từ tự chọn từ từ điển offline                            |
| **Âm**      | 44 âm, gương khẩu hình (giữ nguyên)                                                                  |
| **Tiến độ** | Âm đạt, số từ đã nhớ (xác suất nhớ ≥ 90 %), xu hướng trôi chảy                                       |

### 3.2 Một đơn vị v2 (ví dụ u18 “Gọi đồ uống ở quán cà phê”)

| Mạch             | Nội dung                                                                        | Thời lượng                         |
| ---------------- | ------------------------------------------------------------------------------- | ---------------------------------- |
| Phát âm (có sẵn) | Ngữ điệu câu hỏi, liệt kê, tương phản                                           | 10–15 phút                         |
| Từ vựng          | 15–20 mục: _latte, medium, iced, to go, refill, receipt…_                       | 5 phút học mới, sau đó vào lịch ôn |
| Cụm giao tiếp    | Gọi món (“Can I get…?”), hỏi lại (“Sorry, did you say…?”), lịch sự hay thân mật | 5 phút                             |
| Cấu trúc nói     | “Can I / Could I + V?”, “I'd like…”                                             | 5 phút                             |
| Trôi chảy        | Nói 3 lần: gọi đồ cho cả nhóm bạn                                               | 3 phút                             |
| Giao tiếp        | Hội thoại 6 lượt có sẵn, dùng ≥ 3 mục từ vựng mới                               | 3 phút                             |

Học một đơn vị đầy đủ mất khoảng 3–4 ngày × 15 phút. Mạch phát âm vẫn đi trước để người học đã nói đúng âm khi gặp từ mới.

---

## 4. Mạch từ vựng (V1–V2)

### 4.1 Mục từ

```json
{
  "id": "w.coffee.latte",
  "kind": "word",
  "text": "latte",
  "ipa": "ˈlɑteɪ",
  "pos": "noun",
  "meaning_vi": "cà phê sữa kiểu Ý",
  "example": { "en": "Can I get a medium iced latte?", "vi": "Cho mình một ly latte đá cỡ vừa." },
  "units": ["u18"],
  "level": 3,
  "source": { "list": "custom", "meaning": "authored", "ipa": "ipa-dict" },
  "review": "approved"
}
```

- `kind`: `word` (từ) hoặc `chunk` (cụm như “to go”, “Could you say that again?”).
- `review`: `draft` hoặc `approved`. Chỉ mục `approved` vào bài học chính. Nghĩa thichhoc là dịch máy nên chỉ làm nháp; người duyệt sửa rồi mới đổi sang `approved`.
- Quy mô: cấp 1–2 khoảng 600 mục (ưu tiên NGSL-Spoken), cấp 3–4 khoảng 900 mục. Tổng khoảng 1 500 mục, chia khoảng 60 mục mỗi đơn vị qua các ngày.

### 4.2 Bốn kiểu thẻ cho mỗi mục (mỗi kiểu lập lịch riêng)

| Kiểu                           | Hỏi                               | Trả lời                 | Chấm                                                                                      |
| ------------------------------ | --------------------------------- | ----------------------- | ----------------------------------------------------------------------------------------- |
| **Nghe → hiểu**                | Phát audio                        | Chọn nghĩa (4 lựa chọn) | Tự động                                                                                   |
| **Nghĩa → nói**                | Nghĩa Việt + ngữ cảnh             | Nói từ hoặc cụm         | **Máy chấm âm vị**: đúng chuỗi âm → Good; chỉ có `check` → Hard; sai hoặc im lặng → Again |
| **Điền vào câu**               | Câu ví dụ có chỗ trống, kèm audio | Nói cả câu              | Máy chấm từ mục tiêu trong câu                                                            |
| **Dùng tự do** (cấp 3–4, v1.1) | Tình huống                        | Tự đặt câu              | AI nội dung (V6)                                                                          |

- Mục mới bắt đầu bằng thẻ **Nghe → hiểu**. Khi độ ổn định vượt 3 ngày thì mở **Nghĩa → nói**, sau đó **Điền vào câu**. Người học không phải nói từ chưa nghe bao giờ.
- Người học luôn có nút “Mình nhớ nhưng máy chấm sai” để sửa đánh giá. Đây cũng là dữ liệu false alarm cho pilot (AEC-023).

### 4.3 Lập lịch

- Dùng thư viện `ts-fsrs` (MIT, FSRS-6) chạy hoàn toàn trên máy. Bọc trong `web/src/utils/srs.util.ts` để phần còn lại của app không phụ thuộc trực tiếp vào thư viện.
- Tỷ lệ nhớ mục tiêu mặc định 0,90, chỉnh được 0,85–0,95.
- Mỗi ngày tối đa 20 thẻ mới (chỉnh được). Nếu tồn hơn 100 thẻ đến hạn thì tạm dừng thẻ mới, giống nguyên tắc của brief.
- Âm yếu cũng thành thẻ (`kind: sound`), thay luật cố định 3/7/21 ngày trong `planner`. Phần này làm sau khi lõi ổn định.
- Lưu trong IndexedDB: store `cards` và `reviews`, nâng `DB_VERSION` lên 2, theo hồ sơ. Xuất/nhập cùng bản sao lưu hồ sơ.

---

## 5. Mạch cách nói chuyện và cấu trúc (V3)

### 5.1 Cụm giao tiếp theo chức năng

Mười hai chức năng trải qua 24 đơn vị: chào và giới thiệu, hỏi lại khi không nghe rõ, đề nghị và rủ rê, đồng ý và từ chối lịch sự, xin lỗi, cảm ơn, đưa ý kiến, kể chuyện theo trình tự, so sánh, hướng dẫn, phàn nàn nhẹ nhàng, kết thúc hội thoại.

Mỗi chức năng có ba **mức lịch sự**, ví dụ:

| Thân mật | Trung tính | Trang trọng                         |
| -------- | ---------- | ----------------------------------- |
| “What?”  | “Sorry?”   | “Could you say that again, please?” |

**Bài “Chọn câu hợp ngữ cảnh”:** nghe một tình huống (nói với sếp, với bạn thân, với người lạ), chọn và **nói** câu phù hợp. Chấm gồm hai phần: chọn đúng mức (tự động) và phát âm (máy chấm).

### 5.2 Cấu trúc nói

24 mẫu câu, mỗi đơn vị một mẫu, chọn theo tần suất trong lời nói và theo lỗi người Việt. Ví dụ: hiện tại đơn ngôi ba (-s), quá khứ -ed, câu hỏi với _do/does/did_, _can/can't_, _going to_, _have been_, câu điều kiện đơn giản.

**Bài “Biến đổi câu bằng giọng”:** nghe “I work every day. → yesterday”, người học nói “I worked yesterday.” Máy chấm kiểm tra **âm của đuôi ngữ pháp** (/t/ của _worked_). Đây là chỗ app phát âm hiện có cho lợi thế mà app ngữ pháp thông thường không có: phát hiện **rụng -s/-ed khi nói**, lỗi người Việt hay gặp nhất, bằng máy chấm âm vị đã có.

**Giới hạn:** chỉ chấm câu có đáp án biết trước. Lời nói tự do cần AI (V6).

---

## 6. Mạch độ trôi chảy (V4)

Đo hoàn toàn trên máy, từ VAD và kết quả máy chấm hiện có:

| Chỉ số                   | Cách tính                                                             | Ghi chú                                         |
| ------------------------ | --------------------------------------------------------------------- | ----------------------------------------------- |
| Tốc độ nói               | Số âm tiết (đếm từ chuỗi âm vị nhận được) / tổng thời gian            | Âm tiết ổn định hơn số từ khi không có ASR      |
| Tốc độ phát âm           | Số âm tiết / thời gian có tiếng                                       | Tách khỏi ngắt nghỉ                             |
| Đoạn nói liền trung bình | Số âm tiết giữa hai lần ngắt ≥ 250 ms                                 | Tương quan mạnh với trình độ theo meta-analysis |
| Ngắt nghỉ                | Số lần ngắt ≥ 250 ms mỗi phút; tỷ lệ ngắt giữa câu so với giữa cụm từ | Ngắt giữa cụm từ tệ hơn ngắt ở ranh giới ý      |

**Bài tập:**

- **Nói 3 lần (4/3/2):** cùng đề, 60 → 45 → 30 giây. Hiển thị ba chỉ số của ba lần cạnh nhau.
- **Shadowing có đo** (u23 đã có): thêm so sánh tốc độ và vị trí ngắt với giọng mẫu.

Không quy đổi sang điểm trình độ hay CEFR. Chỉ hiện **xu hướng của chính người học** qua các tuần. Các nghiên cứu cho thấy các chỉ số này chỉ phân biệt tốt giữa các mức cách xa nhau.

---

## 7. Phản hồi nội dung bằng AI (V6, v1.1)

Phần “bạn nói sai ngữ pháp / dùng từ chưa tự nhiên / quá suồng sã” cần hiểu nội dung tự do, nên cần mô hình ngôn ngữ. Có hai phương án, có thể dùng cả hai:

| Phương án                                                                                       | Ưu                                                                           | Nhược                                                                                              |
| ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| **Apple Foundation Models** (iOS 26, mô hình ~3B trên máy, có guided generation trả kiểu Swift) | Miễn phí, offline, không dữ liệu rời máy. Giữ được nhãn “Data Not Collected” | Chỉ máy hỗ trợ Apple Intelligence; chất lượng sửa lỗi tiếng Anh cần đo; cần plugin Capacitor Swift |
| **Cloud** (đã chốt cho v1.1 Pro)                                                                | Chất lượng cao, hội thoại realtime                                           | Tài khoản, chi phí, xin phép gửi giọng                                                             |

Nguyên tắc giữ từ plan khẩu hình: **AI không chấm phát âm**. AI chỉ nhận transcript và trả JSON có cấu trúc `{grammar[], word_choice[], register, better_version}`. Mỗi lượt nhắc tối đa một lỗi nội dung và một lỗi phát âm. Có test kiểm AI không nêu lỗi phát âm.

---

## 8. Kế hoạch theo giai đoạn

| #      | Hạng mục                                                                                                                                                | Nghiệm thu                                                                                      | Ước lượng                           |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------- |
| **V1** | Lõi ôn giãn cách: `srs.util.ts` bọc ts-fsrs; kiểu thẻ, đánh giá, đến hạn, giới hạn thẻ mới; ánh xạ kết quả máy chấm → mức đánh giá                      | Unit test: thẻ mới, chuỗi đánh giá, ánh xạ verdict, giới hạn ngày; coverage ≥ 80 %              | 2–3 ngày                            |
| V2a    | Kho thẻ IndexedDB (`cards`, `reviews`, DB v2, theo hồ sơ, xuất/nhập, xóa)                                                                               | Test nâng cấp DB từ v1 giữ nguyên `runs`; memory store tương đương                              | 2 ngày                              |
| V2b    | Kho từ `content/vocab.json` với schema và test hợp lệ (id duy nhất, `units` tồn tại, từ có trong CMUdict hoặc IPA). Bắt đầu với NGSL-Spoken cho u01–u06 | Script dựng nháp từ NGSL + ipa-dict + thichhoc; ≥ 120 mục `approved` cho cấp 1                  | 1 tuần (phần lớn là duyệt nội dung) |
| V2c    | Tab Từ vựng: phiên ôn, thẻ Nghe → hiểu và Nghĩa → nói có chấm, nút sửa đánh giá                                                                         | e2e một phiên ôn 10 thẻ với mic giả; a11y; offline                                              | 1 tuần                              |
| V3     | Cụm giao tiếp (12 chức năng × 3 mức) và 24 mẫu cấu trúc; bài Chọn câu hợp ngữ cảnh và Biến đổi câu                                                      | Mỗi đơn vị có ≥ 1 chức năng và 1 mẫu; test nội dung; chấm đuôi -s/-ed qua máy chấm              | 2 tuần                              |
| V4     | Chỉ số trôi chảy + bài Nói 3 lần                                                                                                                        | Unit test chỉ số trên audio tổng hợp (biết trước khoảng lặng); hiển thị xu hướng                | 1 tuần                              |
| V5     | Phiên “Hôm nay 15 phút” gộp thẻ đến hạn, bước đơn vị và bài nói; tiến độ có từ đã nhớ                                                                   | e2e hành trình; tiếp tục đúng chỗ sau khi tắt app                                               | 1 tuần                              |
| V6     | Phản hồi nội dung AI (Foundation Models hoặc cloud)                                                                                                     | Thử 50 câu có lỗi đã gán nhãn: precision ≥ 0,8 cho lỗi ngữ pháp được nêu; không nêu lỗi phát âm | 2 tuần, sau v1.0                    |

---

## 9. Nội dung và giấy phép

| Nguồn                            | Dùng cho              | Giấy phép / điều kiện                                                                                    |
| -------------------------------- | --------------------- | -------------------------------------------------------------------------------------------------------- |
| NGSL-Spoken 1.2, NGSL 1.2        | Chọn từ               | CC BY-SA 4.0: ghi nguồn; dữ liệu phái sinh (danh sách từ) giữ cùng giấy phép                             |
| ipa-dict, CMUdict                | IPA                   | MIT / BSD (đã có)                                                                                        |
| thichhoc-dict                    | Nghĩa Việt **nháp**   | CC BY-SA 4.0; dịch máy chưa duyệt nên không dùng thẳng                                                   |
| Tatoeba                          | Câu ví dụ gợi ý       | Chữ: CC BY 2.0 FR. **Audio theo từng người thu**, nhiều người chọn CC BY-NC nên không dùng audio Tatoeba |
| TTS OpenAI (đã chốt)             | Audio từ và câu ví dụ | Dựng một lần, đóng gói sẵn, ghi “giọng AI”                                                               |
| Câu, cụm, chức năng tự biên soạn | Nội dung chính        | Của dự án                                                                                                |

Màn “Giấy phép” hiện có cần thêm NGSL và Tatoeba. Ghi checksum vào `docs/DATA-MANIFEST.json`.

---

## 10. Quyết định cần chủ dự án chốt

1. **Đưa vào v1.0 hay để sau?** Đề xuất: V1–V2 (ôn từ vựng offline) vào v1.0, vì chạy hoàn toàn trên máy, không đổi nhãn riêng tư và làm app đầy đủ hơn khi duyệt. V3–V5 vào v1.1. V6 đi cùng gói Pro.
2. **Ai duyệt nghĩa Việt và câu ví dụ?** Khoảng 1 500 mục. Đề xuất: AI viết nháp, chủ dự án hoặc giáo viên duyệt theo lô 100 mục.
3. **Phản hồi nội dung AI:** thử Apple Foundation Models trên máy trước (miễn phí, riêng tư) hay đi thẳng cloud?
4. **Giấy phép CC BY-SA của NGSL:** chấp nhận phát hành kho từ phái sinh dưới CC BY-SA (mã nguồn app không bị ảnh hưởng)?

---

## 11. Rủi ro

| Rủi ro                                                           | Mức        | Giảm thiểu                                                                       |
| ---------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------- |
| Duyệt nội dung chậm hơn viết code                                | Cao        | Bắt đầu với cấp 1 (≈ 120 mục); công cụ duyệt theo lô; chỉ `approved` mới lên app |
| Máy chấm báo sai khi đánh giá thẻ Nghĩa → nói khiến lịch ôn lệch | Trung bình | Chỉ `error` mới thành Again; nút sửa đánh giá; theo dõi tỷ lệ sửa theo âm        |
| Quá nhiều thẻ đến hạn khiến người học bỏ                         | Trung bình | Giới hạn thẻ mới, dừng thẻ mới khi tồn > 100, phiên mặc định 15 phút             |
| Chỉ số trôi chảy làm người học lo lắng                           | Thấp       | Chỉ so với chính mình, không điểm tuyệt đối, có thể ẩn                           |
| Phạm vi phình to                                                 | Cao        | Mỗi V tự dùng được; V1–V2 có giá trị ngay cả khi V3+ hoãn                        |

---

## 12. Nguồn tham khảo

- [Anki: thuật toán FSRS](https://docs.ankiweb.net/faqs/what-spaced-repetition-algorithm), [Open Spaced Repetition](https://github.com/open-spaced-repetition), [ts-fsrs README](https://cdn.jsdelivr.net/npm/ts-fsrs@5.4.1/README.md)
- [NGSL-Spoken](https://newgeneralservicelist.com/ngsl-spoken), [NGSL 1.2](https://www.newgeneralservicelist.com/new-general-service-list)
- [Tatoeba: giấy phép câu và audio](https://en.wiki.tatoeba.org/history/show-version/3365)
- Độ trôi chảy: [Hsieh & Zechner, đánh giá tự động độ trôi chảy (EALTA 2019)](https://ealta.eu/conference/2019/Conference%20presentations/EALTA%202019%20Powerpoints/Automated%20assessment%20of%20fluency_Hsieh%20&%20Zechner.pdf), [Oral fluency research agenda (Language Teaching)](https://www.cambridge.org/core/journals/language-teaching/article/oral-fluency-in-a-second-language-a-research-agenda-for-the-next-ten-years/9C05358121F94757BE14049B2F4887FC), [Utterance fluency (CJAL 2017)](https://releve.erudit.org/fr/revues/cjal/2017-v20-n2-cjal03335/1050813ar), [arXiv 2608.26137](https://arxiv.org/abs/2608.26137)
- Cụm từ cố định: [Formulaic language in speech fluency development (uOttawa)](https://ruor.uottawa.ca/items/0d8a9524-244f-4ed1-b134-402a429bac54), [Explicit instruction of formulaic sequences](https://avesis.istanbul.edu.tr/yayin/5fa30281-5ed1-4987-8d7e-078bdcefb267/can-explicit-instruction-of-formulaic-sequences-enhance-l2-oral-fluency), [Research in Language 2016](https://czasopisma.uni.lodz.pl/research/article/download/2350/1969/8482)
- [Apple Foundation Models (Create with Swift)](https://createwithswift.com/exploring-the-foundation-models-framework/)

---

## 13. Nhật ký thực hiện

### V1 · Lõi ôn giãn cách: **XONG phần lõi** (23/10)

- `web/src/utils/srs.util.ts` bọc `ts-fsrs` 5.4.2 (MIT, FSRS-6, tắt fuzz để lịch tái lập được). Phần còn lại của app chỉ thấy thẻ `ReviewCard` dạng JSON thuần (giờ ISO-8601 UTC), nên lưu thẳng vào IndexedDB và đổi thư viện không ảnh hưởng dữ liệu đã lưu.
- Có: tạo thẻ, áp một câu trả lời (kèm sự kiện ôn để sau này tối ưu tham số theo người học), xác suất nhớ, thẻ đến hạn, phiên ôn (đến hạn trước, thẻ mới theo giới hạn ngày, dừng thẻ mới khi tồn quá nhiều), mở kiểu thẻ theo thứ tự Nghe → Nói → Điền câu, quy đổi kết quả máy chấm (`ok`/`check`/`error`) thành mức đánh giá, danh sách mục đã nhớ.
- 20 unit test, coverage `srs.util.ts` 100 % dòng. `make ci` phần web xanh (73 file, 315 test).
- Chưa có: kho từ (V2b), giao diện (V2c).

### V2a · Kho thẻ trên máy: **XONG** (23/10)

- IndexedDB `coach` lên phiên bản 2: thêm store `cards` và `reviews`, khóa ghép (hồ sơ, mã) vì mã thẻ chỉ duy nhất trong một hồ sơ. Nâng cấp chỉ thêm store, nên `runs` của bản cũ giữ nguyên (có test mở DB v1 rồi nâng cấp).
- Lưu một câu trả lời ghi thẻ và sự kiện ôn trong cùng một transaction.
- Có memory store tương đương cho nơi không có IndexedDB. Xóa hồ sơ thì xóa thẻ của hồ sơ đó; "Xóa dữ liệu trên thiết bị" xóa cả thẻ.
- Bản sao lưu hồ sơ `aec-profile/1` thêm hai trường tùy chọn `review_cards`, `review_events`. Bản cũ không có vẫn nhập được; máy chủ bỏ qua trường lạ.
