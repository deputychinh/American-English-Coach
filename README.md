# Everyday English — 44 IPA & kho từ offline

Ứng dụng một người dùng trên máy cá nhân, tập trung luyện IPA và phát âm Mỹ.
Không tài khoản, API key, phí thuê bao hay dịch vụ cloud. Bản hiện tại dùng giọng macOS có sẵn.

## Mở ứng dụng

Trên máy Mac này, mở `start.command`; ứng dụng tự mở trình duyệt tại **http://127.0.0.1:8765**.
Hoặc chạy trong thư mục dự án:

```sh
python3 app.py
```

Cần Python 3.9 trở lên. Không cần `pip install`, Node, Docker hay GPU để chạy.
Giữ cửa sổ Terminal mở; Ctrl+C để dừng. Cổng bận thì dùng `python3 app.py --port 8767`.
Trên Windows/Linux, phần chữ chạy được nhưng bản này chưa tích hợp engine giọng nói cho hai hệ đó.

## Bắt đầu học

1. Mở **44 âm IPA**, chọn một âm và đọc hướng dẫn tiếng Việt.
2. Nghe từ mẫu, thu âm, rồi nghe lại bản của mình. Bấm micro chỉ khi muốn ghi.
3. Xem từ đi kèm: IPA Mỹ viết liền, âm đang luyện được tô rõ, nghĩa Việt và từ loại.
4. Dùng **Aa · IPA lớn hơn** nếu cần. Tùy chọn được nhớ trong trình duyệt.
5. Đánh dấu “Đang luyện” hoặc “Đã quen” theo tự đánh giá. Đây không phải điểm chấm tự động.
6. **Kho từ vựng** tra theo từ hoặc phần đầu từ; bộ lọc IPA và nút chuyển trang giữ toàn bộ kho truy cập được.

## Dữ liệu thực tế

| Nội dung | Số lượng / giới hạn |
|---|---|
| Bảng IPA | 44 mục truyền thống, có đối chiếu cách đọc Mỹ |
| Danh sách dwyl `words.txt` | 466.550 mục, bao gồm từ hiếm, tên riêng và ký hiệu |
| Mục có phát âm đối chiếu CMUdict | 72.072 |
| Mục có nghĩa Việt sau ghép dạng gốc/biến thể | 115.655 |
| Nội dung bài học tự biên soạn | 120 mục từ/nghĩa, 60 câu trong 12 tuần |

Nghĩa từ **thichhoc-dict** là bản dịch máy chưa được người kiểm duyệt trong phiên bản nguồn đã tải. App ghi nhãn ngay cạnh nghĩa. Dạng như `geese` được liên kết với `goose`, không giả vờ đó là nghĩa của một mục từ độc lập. Từ không khớp nguồn hiển thị “Chưa có nghĩa Việt”. Không tự gọi dịch trực tuyến.

IPA ưu tiên dữ liệu Mỹ của **ipa-dict**, giữ các cách đọc khác nhau. Mục chỉ có CMU được chuyển âm, bỏ dấu nhấn thay vì đoán vị trí âm tiết và có nhãn riêng. Các biến thể IPA chưa được gắn chính xác với từng từ loại/nghĩa. TTS đọc một cách tổng hợp, không nhất thiết đọc được mọi biến thể đang hiển thị.

Bảng 44 phổ biến có ký hiệu Anh–Anh; app ghi cách Mỹ tương ứng và giải thích sự khác biệt. Không coi Mỹ có đúng 44 âm vị độc lập. Các cách ký âm /i, u/ và /iː, uː/ khác quy ước; /ɫ/ biểu diễn dark l.

## Audio và chi phí

Giọng `Samantha` và `Eddy (English (US))` dùng lệnh `say` của macOS. Audio được tạo lần đầu, lưu WAV rồi phát lại offline. Chọn giọng trong Cài đặt; nếu máy khác thiếu giọng thì tải giọng đó trong cài đặt Trợ năng của macOS trước khi dùng offline.

Không sinh sẵn audio cho cả 466.550 từ: tạo và cache khi cần để giảm dung lượng. Từ thiếu IPA vẫn nghe được TTS nhưng cách đọc được đánh dấu chưa xác minh. Chưa tích hợp STT hay chấm accent AI. Thu âm/nghe lại hoạt động local.

Lịch 90 ngày là khung luyện tập, dùng lại nội dung khởi đầu; chưa phải 90 bộ bài riêng. Không có cam kết thành thạo tiếng Anh hay đọc/hiểu mọi từ trong 3 tháng.

## Lưu và sao lưu

- Tiến độ, cài đặt, lịch ôn: `data/coach.sqlite3`.
- Bản ghi: `data/recordings/`; audio mẫu cache: `data/audio/`.
- Cài đặt → Xuất JSON sao lưu phần tiến độ. JSON **không chứa bản ghi âm**.
- Muốn sao lưu đầy đủ: dừng app rồi sao chép cả thư mục `data/`.
- Khôi phục JSON thay thế tiến độ hiện có, cần tích chọn xác nhận trong UI.
- `--data-dir /đường/dẫn/khác` chạy hồ sơ riêng; không dùng hai app đồng thời trên cùng thư mục tiến độ.

Nguồn dữ liệu đi kèm trong `vendor/`. `vendor/lexicon.sqlite3` là chỉ mục có thể tái tạo; ứng dụng tự tạo khi thiếu hoặc khác phiên bản. Không xóa `data/` khi cập nhật.

## Kiểm tra

```sh
python3 -m unittest discover -s tests -q
node --test tests/lexicon-view.test.mjs
```

Node chỉ phục vụ kiểm thử helper giao diện, không cần để chạy app. Chi tiết kiểm chứng: [docs/VERIFICATION.md](docs/VERIFICATION.md).

## Nguồn và giấy phép

- [dwyl/english-words](https://github.com/dwyl/english-words): danh sách từ; xem `vendor/ENGLISH-WORDS-LICENSE.md`.
- [CMUdict](https://github.com/cmusphinx/cmudict): ARPAbet và lọc âm; BSD, `vendor/CMUDICT-LICENSE`.
- [ipa-dict](https://github.com/open-dict-data/ipa-dict): phiên âm Mỹ; MIT, `vendor/IPA-DICT-LICENSE`.
- [thichhoc-dict](https://github.com/thichhoc-org/thichhoc-dict): nghĩa Việt và biến thể; CC BY-SA 4.0, `vendor/thichhoc/LICENSE-DATA`. Nguồn gốc: WordNet 3.1 (Princeton), CMUdict (CMU), Wiktionary. Đã chỉnh sửa dữ liệu: chọn trường, liên kết biến thể và lập chỉ mục; giữ nội dung nghĩa. Phần dữ liệu phái sinh tiếp tục theo CC BY-SA 4.0.
- Noto Sans từ [google/fonts](https://github.com/google/fonts/tree/main/ofl/notosans), SIL OFL; font nằm local và kèm giấy phép.

Nguồn, kích thước, SHA-256 của các tệp đã tải: [docs/DATA-MANIFEST.json](docs/DATA-MANIFEST.json). Giấy phép đọc được ngay ở cuối giao diện, không cần mạng.

Thiết kế và hướng phát triển: [PRODUCT-BRIEF.md](PRODUCT-BRIEF.md), [nghiên cứu repository](docs/REPOSITORY-RESEARCH.md).
