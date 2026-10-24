# Nhật ký thay đổi

Theo [Keep a Changelog](https://keepachangelog.com/vi/1.1.0/); phiên bản theo [SemVer](https://semver.org/lang/vi/). Phiên bản dùng chung cho API, web và app iOS.

## [Unreleased]

### Thêm

- Kết quả luyện tập kiểu app (E3): đầu sheet là vòng điểm và một câu nhận xét ("Rất tốt!", "Gần được rồi", "Luyện thêm chút nữa"). Câu nói hiện thành các từ bấm được, mỗi từ mang màu và dấu của âm yếu nhất. Từ cần sửa đầu tiên mở sẵn ở âm yếu nhất của nó, nên lời khuyên và khẩu hình hiện ngay mà không cần bấm. Nút thu âm thành giữ để nói: giữ để nói, thả ra để chấm. Bấm một lần hoặc dùng bàn phím vẫn thu âm và tự dừng khi im lặng.
- Trang chủ và điều hướng (E4): thẻ "Hôm nay 15 phút" là thẻ chính, chạm vào bất kỳ đâu trên thẻ để bắt đầu. Mục tiêu ngày nằm phẳng bên dưới. Đơn vị đang học, Từ vựng, Cách nói và Nói trôi chảy gộp thành một danh sách "Luyện thêm" kiểu iOS. Trang chủ và các trang tab có tiêu đề lớn, khi cuộn qua thì thu nhỏ lên một thanh ở đầu màn.
- Plan v2 mở rộng từ phát âm sang từ vựng, cách nói chuyện, cấu trúc nói và độ trôi chảy (`docs/PLAN-V2-SPEAKING-AND-VOCABULARY.md`); lõi lịch ôn giãn cách FSRS chạy trên máy (`web/src/utils/srs.util.ts`), chưa có giao diện. Thẻ ôn và lịch sử ôn lưu trong IndexedDB theo hồ sơ (DB phiên bản 2, giữ nguyên kết quả chấm cũ), đi cùng bản sao lưu hồ sơ và bị xóa khi xóa dữ liệu trên thiết bị.
- Từ vựng (`/vocab/`, thẻ "Ôn từ vựng" trên Trang chủ, chạy offline): 186 mục lấy từ hội thoại của 24 đơn vị (`content/vocab.json`). Ôn theo lịch FSRS: nghe chọn nghĩa, nhìn nghĩa rồi nói, nói cả câu điền chỗ trống. Máy chấm âm vị chấm phần nói, người học có thể sửa đánh giá. 93 nghĩa từ là bản nháp, có nhãn "Nghĩa chờ duyệt".
- Cách nói (`/talk/`, thẻ "Luyện cách nói" trên Trang chủ, chạy offline): 12 chức năng giao tiếp, mỗi chức năng một câu thân mật, trung tính, trang trọng và tình huống cho từng mức; 24 mẫu câu, mỗi đơn vị một mẫu với 4 câu biến đổi (`content/talk.json`). Bài "Chọn câu hợp ngữ cảnh" chọn rồi nói câu; bài "Biến đổi câu bằng giọng" nghe câu và gợi ý rồi nói câu mới. Với mẫu số nhiều, ngôi ba -s và quá khứ -ed, máy chấm báo đuôi được nói rõ, chưa rõ hay bị nuốt. Ôn theo lịch FSRS, 10 thẻ mới mỗi ngày; sheet đơn vị trong Lộ trình có nút luyện cách nói của đơn vị đó.
- Góp ý nội dung bằng AI (`POST /api/v1/tutor/feedback`, khung "Góp ý nội dung (AI)" sau Nói 3 lần, ADR 0005): người học gõ lại hoặc đọc chính tả điều đã nói và nhận một góp ý về ngữ pháp hoặc cách dùng từ, mức lịch sự, và một câu tự nhiên hơn. Chỉ chữ được gửi, không gửi âm thanh, và chỉ khi máy chấm có bật gia sư AI. Góp ý về phát âm luôn bị lọc. `make eval-feedback` đo precision trên 50 câu có lỗi đã gán nhãn.
- Hôm nay 15 phút (`/today/`, thẻ đầu Trang chủ): một phiên gộp ôn từ vựng, luyện cách nói, bước tiếp của đơn vị đang học và một bài Nói 3 lần. Mỗi phần tự đánh dấu xong theo việc người học đã làm trên máy, nên tắt app rồi mở lại vẫn đúng chỗ. Các màn mở từ phiên có nút "Tiếp tục phiên hôm nay". Màn Tiến độ có thêm số từ đã nhớ và xu hướng nói trôi chảy.
- Nói trôi chảy (`/fluency/`, thẻ "Nói trôi chảy" trên Trang chủ, chạy offline): bài "Nói 3 lần" về chủ đề của mỗi đơn vị trong 60, 45 rồi 30 giây (`content/fluency.json`, kèm ý gợi ý và cụm từ có thể bấm nghe). App đo tốc độ nói, đoạn nói liền và ngắt nghỉ ngay từ âm thanh trên máy (đếm âm tiết theo de Jong & Wempe), đặt ba lần cạnh nhau, so lần cuối với lần đầu, và hiện xu hướng các lượt gần đây. Số đo chỉ so người học với chính họ và có thể ẩn. Âm thanh không được lưu.
- Web app cài lên màn hình chính (`make build-webapp`, `docs/webapp.md`, ADR 0004): bản export tĩnh không cần máy chấm. App tự trả lời API như app iOS và chấm phát âm ngay trong trình duyệt bằng ONNX Runtime Web trong một worker. Gói chấm điểm 357 MB chia 15 mảnh có SHA-256, tải một lần vào Cache Storage, tải tiếp được khi bị ngắt. Sau đó luyện tập và chấm chạy cả khi mất mạng. Thẻ "Cài app lên màn hình chính" trên Trang chủ có nút cài trên Chrome/Edge/Android và hướng dẫn qua nút Chia sẻ trên iPhone/iPad. Manifest có icon maskable, icon Apple tràn viền và lối tắt Luyện tập, Từ vựng, Cách nói. Khi không có giọng mẫu đóng gói và không có máy chấm, "Nghe mẫu" đọc bằng giọng tiếng Anh Mỹ của trình duyệt.
- Trải nghiệm di động làm lại (`docs/design/mobile-ux-overhaul.md`): chạm kiểu app (trạng thái nhấn, không trễ, vùng chạm 44 px, rung nhẹ trong app iOS); bỏ thanh thương hiệu trên điện thoại; trình phát bài học toàn màn có nút đóng cho Luyện tập, Nghe, Hiệu chỉnh, màn bắt đầu; trang chủ "Hôm nay" vừa một màn; danh sách dày với sheet cho 44 âm, lộ trình, khóa 14 ngày, cài đặt và tiến độ.
- Chấm nhanh hơn: máy chấm nạp sẵn mô hình, từ điển và bộ đo cao độ ngay khi khởi động, nên lần chấm đầu không còn chờ 6 giây; với một từ, app kết thúc lượt nói sau 0,45 giây im lặng thay vì 0,9 giây (câu giữ 0,75 giây để không cắt giữa chừng).
- Camera luyện tập bật sẵn; khung hình giữ đúng tỉ lệ camera nên đường viền môi và môi mẫu luôn nằm đúng miệng, khung nhỏ tự phóng to vào miệng khi thấy mặt; gợi ý "Đưa mặt vào khung" gọn một dòng.
- Giao diện tối: các nền nhấn dùng sắc độ trong suốt thay cho khối nâu đục; bảng 44 âm hiện ký hiệu IPA dạng chữ, chỉ thẻ đang chọn có màu.
- Lộ trình đủ 4 cấp × 24 đơn vị: cấp 2 "Rõ ràng" (nhịp, cụm phụ âm đầu/cuối, -ed, r/l, v/w/f, trọng tâm câu), cấp 3 "Tự nhiên" (schwa, nối âm, flap t, nguyên âm đôi, ɑ ɔ ɝ, trọng âm từ dài, ngữ điệu), cấp 4 "Thuần thục" (nhóm ý, nhấn tương phản, nói giảm, h ŋ j, shadowing, nói 1 phút); thêm 22 cặp tối thiểu, 26 câu và 12 lỗi thường gặp của người Việt.
- Kiểm tra trình độ 3 phút (`/placement/`, chạy offline): 12 câu nghe trải đều 4 cấp, xếp cấp bắt đầu và lưu trên máy; thẻ "Tiếp tục lộ trình" theo kết quả và hiện tiến độ cấp "Cấp N · x/6 đơn vị"; trang chủ ẩn banner máy chấm khi mọi thứ ổn, chỉ hiện khi có sự cố.
- Gương có "Nói thử": chấm âm đích và khẩu hình cùng lúc, 3 lần đúng liên tiếp mới tính là nắm được âm.

- Màn Gương làm lại cho điện thoại theo mẫu ứng dụng camera (`docs/design/mobile-mirror.md`): camera cạnh-sát-cạnh, "bóng mờ" mẫu môi căn theo miệng thật, vòng điểm khớp 0–100 % ba màu, một gợi ý chỉnh duy nhất bằng câu tự nhiên, chip trạng thái từng đặc trưng, chi tiết thu gọn, sheet chọn âm 44 âm có tìm kiếm; rung và âm báo khi giữ đúng. Hiệu chỉnh dùng cùng sân khấu camera. Trên điện thoại, màn camera ẩn header/footer; các màn khác bỏ footer (link chính sách nằm trong Cài đặt).
- Lộ trình phát âm chuẩn (`content/curriculum.json`, `GET /curriculum`, trang `/curriculum/`): cấp 1 với 6 đơn vị, mỗi đơn vị 5 bước (xem khẩu hình, nghe phân biệt, luyện có chấm, shadowing, hội thoại); tiến độ theo hồ sơ; nội dung được kiểm tra chéo với âm, cặp và câu khi khởi động.
- Bài nghe phân biệt (`/listen/?unit=…`, chạy offline): nghe chọn từ trong cặp tối thiểu, chọn âm tiết mạnh, chọn từ trọng tâm; phản hồi tức thì, tổng kết độ chính xác lưu trên máy và hiện ở bước 2 của đơn vị.
- Màn Luyện tập một màn hình: thanh trên gọn, câu/từ ở giữa (camera thu nhỏ có bóng mờ mẫu môi khi bật), nút thu tròn ở dưới với vòng mức âm; kết quả trượt lên dạng sheet với vòng điểm %, từng âm bấm xem chi tiết và nút Tiếp theo của bài luyện âm.
- App iOS: `make ios-device` build ký, cài và mở app trên iPhone thật với địa chỉ Mac nhúng sẵn; banner và lỗi 401 chỉ dẫn ghép nối bằng tiếng Việt; thẻ Ghép nối lên đầu Cài đặt trong vỏ native.

- Ngoại tuyến có kiểm soát: service worker phiên bản theo build id precache toàn bộ vỏ ứng dụng; nội dung bài, khóa học, kế hoạch, tiến độ, hiệu chỉnh và giọng mẫu được giữ lại theo hồ sơ nên vẫn xem được khi máy chấm không chạy; `/health`, `/ready` và chấm điểm không bao giờ qua cache. Unit test chạy `sw.js` trong `node:vm` và e2e `offline.spec.ts`.

### Sửa

- App iOS: nội dung cuộn không còn chạy dưới đồng hồ trên thanh trạng thái; màn chào mừng mô tả đúng việc chấm ngay trên máy.
- Service worker: precache thêm `/vocab/`, `/talk/`, `/lesson/`, `/licenses/` để các màn này mở được khi offline; không precache bản sao ONNX Runtime (14 MB) mà bundler tạo ra.
- Máy chấm: hai lượt chấm đầu tiên chạy cùng lúc có thể lỗi "compilation disabled" của numba; lần biên dịch đầu giờ được tuần tự hóa.
- Gương: chạm nút mic đúng lúc lượt nói tự kết thúc không còn làm kẹt trạng thái "Đang nghe".
- Giọng mẫu im lặng trên iPhone đã ghép nối: thẻ `<audio>` không gửi được token nên mọi lần "Nghe mẫu" bị máy chấm trả 401. App giờ tải giọng mẫu bằng `fetch` có token (giữ trong bộ nhớ theo phiên) và báo rõ khi chưa ghép nối hoặc máy chấm không chạy, kể cả ở màn Gương.
- Chấm quá gắt khi bật camera: chỉ những âm camera nhìn rõ (P/B/M, F/V, nguyên âm tròn môi) mới được đổi "xem lại" thành "sai"; nhóm độ tin cậy trung bình chỉ thêm gợi ý khẩu hình; âm camera gần như không thấy (T/D/N/L, K/G, R…) không còn bị khẩu hình chi phối.
- Cài đặt: dòng "Ghép nối điện thoại" không còn ghi "Chưa ghép nối" trong lúc một sheet đang mở.
- Chấm công bằng hơn với giọng Mỹ chuẩn (đo bằng `make sweep`: 440 từ luyện × 2 giọng macOS):
  - Chấp nhận các biến thể hợp lệ: trước /r/ không phân biệt /ɪ/~/i/, /ɛ/~/e/, /ʊ/~/u/~/ɔ/~/ɝ/ (tour, sure, near, air), /ɔ/ gộp với /ɑ/ (caught–cot), /p t k/ cuối từ không bật hơi (nghe như /b d g/) và /t/ đầu từ bật hơi mạnh (nghe như /h/). Báo nhầm trên giọng chuẩn giảm từ 18% xuống 16,1%; bộ thử thay âm vẫn bắt được đúng những lỗi như trước.
  - Bỏ 14 từ luyện mà một biến thể phiên âm không có âm đích ("ear", "law", "with"…), vì máy chấm không tìm thấy âm để chấm. Đã thay bằng từ khác đã kiểm.
  - "Gần đúng" được nửa điểm trên vòng điểm và không còn làm mất chuỗi 3 lần đúng ở màn Gương. Chỉ "Chưa đúng" thật mới reset chuỗi.
- Nhãn độ tin cậy của máy chấm cho từng âm (`content/scorer_reliability.json`, sinh bởi `make sweep`, trả trong `/content/sounds`): ở 6 âm máy chấm hay nhầm với giọng chuẩn (/ʊ/, /ʌ/, /ɔɪ/, /f/, /k/, /tʃ/), màn Gương và tổng kết bài luyện nói rõ "Gần đúng" chưa chắc là sai và gợi ý nghe lại bản ghi để tự so với mẫu.
- Gương/Luyện tập: lượt thu đôi khi báo "Chưa nghe thấy tiếng" dù người học đã nói, vì luồng chính bận nhận diện khuôn mặt làm âm thanh đến trễ, trong khi bộ phát hiện giọng đếm giờ bằng đồng hồ thực. Bộ phát hiện giọng giờ đếm theo thời gian âm thanh; im lặng tuyệt đối (lọc ồn iOS) không còn đẩy ngưỡng lên.
- Gương: viên "Âm: Gần đúng" màu hổ phách thay vì đỏ, "Camera không thấy" màu trung tính.
- e2e kiểm giọng mẫu ở mọi màn có nút phát: bảng âm, Nghe, Xếp lớp, Gương, Luyện tập.
- e2e chạy ở "chế độ điện thoại" (`COACH_TRUST_LOOPBACK=false` + ghép nối thật trong global setup) trên CI, nên request quên token sẽ hỏng ngay trên CI thay vì trên máy người học.

## [1.1.0] - 2026-10-17

### Thêm

- Hồ sơ nhiều người học: tạo/đổi tên/xóa, xuất và nhập tệp `aec-profile/1`; tiến độ, kế hoạch và hiệu chỉnh tách theo hồ sơ (header `X-Coach-Profile`, migration 0003).
- Kế hoạch tuần: `GET /plan` với chuỗi ngày liên tiếp, 7 ngày gần nhất theo múi giờ người học, 3 âm trọng tâm có lý do (yếu / ôn lại / mới); thẻ "Hôm nay luyện gì", mục tiêu mỗi ngày và nhắc luyện hằng ngày trên iOS.
- Khóa 14 ngày cho người Việt (`content/course.json`, `GET /course`, trang `/course/`) với tiến độ theo từng mục.
- Màn hình bắt đầu lần đầu (`/welcome/`): quyền micro/camera có giải thích, hồ sơ, hiệu chỉnh.
- Giao diện song ngữ Việt/Anh, đổi trong Cài đặt; không còn chuỗi cứng trong mã.
- Thư viện giọng người thật có giấy phép (`content/voice/`) ưu tiên trước giọng tổng hợp; header `X-Coach-Voice`.
- Công cụ pilot: `make pilot-export` / `make pilot-report` để bật mức `error` theo precision đo được.
- Kiểm tra tiếp cận bằng axe-core trên 10 trang trong e2e; hướng dẫn HTTPS từ xa (Tailscale/Caddy).

### Sửa

- POST tới máy chấm có địa chỉ (ghép nối, chấm, tạo hồ sơ) thất bại vì thân yêu cầu bị sao chép thành stream; giờ sao chép thành bytes. Phiên bản iOS lấy từ cấu hình project; Team ID ký đúng.

### Sửa

- Mốc thời gian trả về đúng UTC (`Z`), hiển thị đúng giờ Việt Nam.
- Image Docker: thêm Alembic, `httpx` là phụ thuộc chạy, torch bản CPU cho Linux.

## [1.0.0] - 2026-10-17

- Bản đầu: chấm 44 âm bằng wav2vec2 + GOP, gương khẩu hình MediaPipe, prosody, gia sư AI, ghép nối điện thoại, app iOS Capacitor.
