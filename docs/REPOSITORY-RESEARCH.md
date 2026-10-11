# Nghiên cứu nguồn từ vựng và công nghệ giọng nói

Ngày kiểm tra: 2026-10-11. Phạm vi: đọc README, tài liệu và thông tin giấy phép công khai; chưa clone, chạy model, nghe so sánh hay đo hiệu năng. Nhận xét chất lượng/chi phí dưới đây là đề xuất cần kiểm chứng, không phải kết quả benchmark. Không dùng số stars làm bằng chứng phù hợp.

## 1. Kết luận để ra quyết định

Đề xuất thử bộ dữ liệu **CMUdict + wordfreq + Open English Wordnet**, dùng Kaikki/Wiktextract để mở rộng sau. `dwyl/english-words` là nguồn tra cứu tùy chọn, không phải giáo trình. Nghĩa tiếng Việt và bài học cần một lớp nội dung được biên tập riêng.

**Ràng buộc đã xác nhận của người dùng:** chạy trên máy cá nhân, chi phí gần bằng 0. Không dùng API trả phí hay cloud inference trong thiết kế mặc định. Tải dependency/model/dataset một lần khi setup; bài học đã cài phải dùng được khi ngắt mạng.

Đề xuất thử **Kokoro** để tạo audio Mỹ, bổ sung bản ghi người thật được chọn và kiểm tra. Thử **whisper.cpp** cho máy Apple Silicon hoặc **faster-whisper** CPU cho backend local. Chỉ quyết định sau khi đo trên máy chạy thực tế. Phần đánh giá phát âm là một hệ thống riêng: thử OpenPronounce/GOPT ở nhánh nghiên cứu. Azure được giữ trong bảng để hiểu khả năng của dịch vụ tham chiếu, **loại khỏi phương án triển khai hiện tại**.

Một ứng dụng luyện giọng cần sáu phần: từ/nghĩa → phiên âm → audio mẫu → nhận dạng → đánh giá âm/ngữ điệu → lịch luyện cá nhân. Không có repo nào trong danh sách này cung cấp đầy đủ cả sáu phần cùng giáo trình 90 ngày cho người Việt.

## 2. Nguồn từ và nghĩa

| Nguồn chính thức | Có thể cung cấp | Hạn chế ảnh hưởng dự án | Quyết định đề xuất |
|---|---|---|---|
| [dwyl/english-words](https://github.com/dwyl/english-words) | Danh sách từ; bản alphabetic và JSON membership | Không có nghĩa, tần suất, cấp độ, audio; JSON giá trị 1 không phải định nghĩa. Repo hiển thị Unlicense nhưng README còn ghi copyright của nguồn ban đầu | Tra cứu/gợi ý tùy chọn; chưa phân phối toàn bộ dữ liệu khi nguồn gốc chưa được làm rõ |
| [cmusphinx/cmudict](https://github.com/cmusphinx/cmudict) | Phát âm Mỹ bằng ARPAbet, trọng âm và biến thể | Không có nghĩa/audio; có lỗi và từ thiếu theo chính README | Nguồn phát âm chính cho pilot; giữ dạng gốc và mapping sang IPA được kiểm tra |
| [rspeer/wordfreq](https://github.com/rspeer/wordfreq) | Tần suất, Zipf score, thứ tự từ phổ biến | Không phải CEFR, không tự xác định nghĩa thông dụng; code Apache, dữ liệu CC BY-SA và ghi nhận nguồn; README phản đối xuất CSV làm mất attribution | Dùng thư viện có attribution để xếp ưu tiên, không sao chép thành wordlist không nguồn |
| [open-dict-data/ipa-dict](https://github.com/open-dict-data/ipa-dict) | IPA nhiều ngôn ngữ, có en_US | en_US dựa trên dữ liệu CMU chuyển đổi, không phải nguồn độc lập để xác minh CMU. MIT mặc định; dữ liệu bên thứ ba giữ giấy phép riêng | Đối chiếu cách trình bày IPA; không cần nhập trùng toàn bộ |
| [globalwordnet/english-wordnet](https://github.com/globalwordnet/english-wordnet) | Nghĩa theo synset, quan hệ nghĩa và từ loại | Không phải từ điển Anh–Việt hay giáo trình giao tiếp; tách bản thường và proper names | Nguồn nghĩa Anh có cấu trúc cho pilot; CC BY 4.0 theo README |
| [tatuylonen/wiktextract](https://github.com/tatuylonen/wiktextract) | Công cụ trích xuất Wiktionary: nghĩa, ví dụ, phát âm và metadata tùy mục từ | Chạy extractor toàn dump phức tạp; trường dữ liệu không đồng đều; giấy phép công cụ không thay thế giấy phép nội dung | Không chạy toàn dump trong MVP; khảo sát dữ liệu đã trích xuất tại Kaikki |
| [Kaikki English](https://kaikki.org/dictionary/English/) | Dữ liệu Wiktionary máy đọc được | Cần lọc nghĩa cổ/hiếm, dialect và độ đầy đủ; không đảm bảo mọi mục có nghĩa Việt/audio | Nguồn mở rộng, thử một tập nhỏ trước khi nhập |
| [meetDeveloper/freeDictionaryAPI](https://github.com/meetDeveloper/freeDictionaryAPI) | API định nghĩa, phonetics, ví dụ và audio khi có | Thiếu dữ liệu tùy từ; không bảo đảm audio Mỹ. README nêu khó khăn vận hành do chi phí; code GPL-3.0 không tự bao phủ quyền của mọi media | Không dùng hosted API trong runtime local; chỉ tham khảo cấu trúc dữ liệu |
| [hexgrad/misaki](https://github.com/hexgrad/misaki) | G2P, có cấu hình American English và fallback espeak | Ký hiệu đầu ra phục vụ model có khác biệt với IPA trình bày cho người học; từ ngoài từ điển chỉ được dự đoán | Hỗ trợ TTS và gợi ý phát âm từ thiếu; luôn gắn nhãn dự đoán |

Đối với nội dung Wiktionary, đọc [Wiktionary Copyrights](https://en.wiktionary.org/wiki/Wiktionary:Copyrights): văn bản và media có thể có điều khoản khác nhau. Mọi bản nhập phải giữ source URL, phiên bản và attribution ở cấp dữ liệu phù hợp; bảng này chưa phải quyết định pháp lý về phân phối.

## 3. Giọng mẫu và audio người thật

| Nguồn chính thức | Có thể cung cấp | Hạn chế | Quyết định đề xuất |
|---|---|---|---|
| [hexgrad/kokoro](https://github.com/hexgrad/kokoro) | TTS open-weight 82M, có American English `lang_code='a'`, có cấu hình tốc độ; repo/weights được giới thiệu là Apache | Chưa thử độ đúng nguyên âm, trọng âm, âm cuối hay tốc độ trên máy này; code có phụ thuộc khác cần kiểm tra | Ứng viên TTS đầu tiên, tạo trước và cache audio; kiểm tra model/voice cụ thể trước phân phối |
| [OHF-Voice/piper1-gpl](https://github.com/OHF-Voice/piper1-gpl) | TTS local, CLI/API, chọn voice | Engine GPL-3.0; model voice có giấy phép riêng; README đang tìm maintainer. Không mặc định mọi voice là Mỹ | Phương án thay thế khi ưu tiên local; kiểm tra voice/model card từng giọng |
| [coqui-ai/TTS](https://github.com/coqui-ai/TTS) và [XTTS-v2 model card](https://huggingface.co/coqui/XTTS-v2) | Framework TTS đa model; XTTS có voice cloning | Framework MPL-2.0, XTTS-v2 dùng Coqui Public Model License riêng; cloning không trực tiếp giải quyết sửa phát âm | Không chọn cloning cho MVP; chỉ xem xét model cụ thể khi có nhu cầu |
| [LibriSpeech](https://www.openslr.org/12) | Kho lời đọc từ audiobook và transcript, CC BY 4.0 | Lời đọc sách khác hội thoại; không phải mọi speaker đều được xác minh accent Mỹ hoặc phù hợp trình độ | Chọn ít clip cho bài nghe nâng dần; gắn accent đã kiểm tra, không nhập toàn kho |
| [Tatoeba](https://tatoeba.org/en/terms_of_use) | Câu, bản dịch và một số audio người thật | [Giấy phép audio theo đóng góp](https://en.wiki.tatoeba.org/articles/show/faq), chất lượng/giọng khác nhau; không phải mọi câu có audio hoặc nghĩa Việt | Nguồn câu bổ sung sau kiểm tra từng câu và bản ghi |

Audio tổng hợp phải có nhãn TTS; bản ghi người thật phải có nhãn human. Bài kiểm tra chuyển giao cần có speaker chưa xuất hiện trong bài luyện. Chưa có bằng chứng TTS nào ở đây tự đủ để dạy toàn bộ nhịp, ngữ điệu và khẩu hình; cần nội dung hướng dẫn được biên tập.

## 4. Nhận dạng và căn thời gian

| Repo chính thức | Vai trò | Hạn chế | Quyết định đề xuất |
|---|---|---|---|
| [openai/whisper](https://github.com/openai/whisper) | Model/công cụ ASR, transcript; MIT theo repo | Không cung cấp rubric chấm accent; có thể nhận ra từ dù âm chưa chuẩn | Baseline tham chiếu, chưa cần dùng trực tiếp nếu chọn runtime khác |
| [SYSTRAN/faster-whisper](https://github.com/SYSTRAN/faster-whisper) | Runtime CTranslate2, CPU INT8/GPU, timestamps và VAD; MIT | GPU theo stack NVIDIA/CUDA; benchmark README không phải tốc độ máy của dự án | Ứng viên backend; thử audio ngắn, model nhỏ trước |
| [ggml-org/whisper.cpp](https://github.com/ggml-org/whisper.cpp) | Runtime C/C++, có Apple Silicon/Core ML; repo cũ ggerganov đã chuyển hướng | Cần chọn model/build và adapter; chưa biết cấu hình máy triển khai | Ưu tiên khảo sát nếu chạy local trên Mac Apple Silicon |
| [m-bain/whisperX](https://github.com/m-bain/whisperX) | ASR + alignment cho word timestamps, có diarization | README nêu hạn chế với số/ký tự ngoài dictionary, speech chồng lấn, diarization. Model phụ có điều kiện riêng | Tùy chọn để tạo đoạn nghe theo từ; chưa cần diarization cho thu âm một người |
| [MontrealCorpusTools/Montreal-Forced-Aligner](https://github.com/MontrealCorpusTools/Montreal-Forced-Aligner) | Forced alignment audio với transcript bằng Kaldi; code MIT | Căn transcript cho trước không chứng minh từ/âm được nói đúng; cần acoustic model/dictionary | Công cụ xử lý nội dung offline; không dùng alignment thành điểm accent |

ASR trả lời “máy nhận ra lời gì”; alignment trả lời “phần lời này nằm ở đâu”; assessment mới đánh giá chất lượng phát âm. Điểm ba nhóm này phải được lưu và hiển thị riêng.

## 5. Đánh giá phát âm và ôn tập

| Nguồn chính thức | Giá trị | Bằng chứng hạn chế | Quyết định đề xuất |
|---|---|---|---|
| [YuanGongND/gopt](https://github.com/YuanGongND/gopt) | Nghiên cứu chấm phát âm ở cấp phoneme/word/utterance và nhiều khía cạnh; BSD-3-Clause theo repo | Pipeline GOP/Kaldi; README cảnh báo bug của hướng dẫn inference riêng. Kết quả công bố trên SpeechOcean762 không chứng minh chất lượng cho người Việt | Nhánh R&D, chưa coi là API có thể đưa thẳng vào sản phẩm |
| [jimbozhang/speechocean762](https://github.com/jimbozhang/speechocean762), [OpenSLR 101](https://www.openslr.org/101) | Dữ liệu chấm phát âm, 5 chuyên gia chấm độc lập; 5.000 câu, CC BY 4.0 | Người nói có tiếng mẹ đẻ Mandarin, gồm trẻ em và người lớn; khác nhóm mục tiêu Việt | Benchmark tham khảo và kiểm tra pipeline; cần bộ người Việt riêng |
| [Halleck45/OpenPronounce](https://github.com/Halleck45/OpenPronounce) | Chấm âm vị local CPU, transcript và phản hồi âm; MIT theo repo | README công bố chỉ khoảng một trong năm từ bị gắn lỗi được human raters xem là sai trên benchmark được nêu; heuristics có false alarms | Chỉ prototype; chưa cho phép phản hồi lỗi âm như kết luận chắc chắn |
| [Azure Pronunciation Assessment](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-pronunciation-assessment) | Accuracy ở nhiều cấp, fluency/completeness/prosody; en-US có hỗ trợ chi tiết | Dịch vụ cloud có phí và điều kiện sử dụng; điểm model chưa phải đánh giá của người nghe Việt/Mỹ trong bối cảnh này | Loại khỏi triển khai vì yêu cầu local/gần 0 chi phí; chỉ tham khảo tài liệu, không gọi dịch vụ |
| [open-spaced-repetition/ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs) | Scheduler ôn cách quãng TypeScript; MIT | Cần ánh xạ kết quả bài học thành rating; không tự thiết kế giáo trình âm/ngữ điệu | Ứng viên cho thẻ từ nếu chọn TypeScript; giữ lịch kỹ năng riêng, chưa chốt implementation |

Các nhận xét định lượng trong phần OpenPronounce là tác giả tự công bố, chưa được dự án tái lập. Không so sánh trực tiếp điểm PCC của GOPT với precision của OpenPronounce: chúng đo khác nhau, dùng thiết lập khác nhau.

## 6. Bộ thử trước khi chọn công nghệ

Các kích thước và ngưỡng dưới đây là **đề xuất nghiệm thu kỹ thuật**, không phải kết quả đã đạt hoặc chuẩn học thuật.

### Từ điển

- Lấy 200 mục có phân tầng: từ thông dụng, từ đa nghĩa, từ đồng tự khác cách đọc, biến thể, phrasal verb và từ ngoài CMU.
- Kiểm tra join theo lemma/từ loại/nghĩa, không join chỉ theo chuỗi từ.
- Ghi tỷ lệ có phiên âm Mỹ, nghĩa Anh, nghĩa Việt đã duyệt và audio đúng.
- Đặc biệt thử `read` ở hiện tại/quá khứ, `record` danh/động từ, `lead`, `live`, tên riêng, contractions và từ có dấu gạch nối.
- Muốn thêm vào bài học: 100% mục trong tập bài học phải qua kiểm tra nội dung; coverage thấp thì giảm tập học, không tự điền dữ liệu giả.

### Giọng mẫu

- Cùng một bộ 100 câu: minimal pairs, trọng âm, âm cuối, câu hỏi, số/ngày và từ đa cách đọc.
- Cho người có chuyên môn nghe kiểm tra phát âm, văn bản/audio khớp và tính phù hợp giọng Mỹ. Cần ít nhất 2 voice đã duyệt để tránh luyện một giọng duy nhất.
- Đo thời gian tạo audio, RAM/VRAM, khả năng chạy CPU/Mac/GPU. Chỉ cache bản đã duyệt; không dùng lời quảng cáo chất lượng trong README làm kết quả.

### ASR và đánh giá phát âm

- Bộ pilot đề xuất: 10 người Việt × 20 câu = 200 bản ghi, có đồng ý sử dụng; 2 người chấm độc lập theo cùng rubric. Khi chỉ có một người dùng, thử trước 20 câu của người đó nhưng chưa suy rộng độ tin cậy.
- Có mẫu đúng, lỗi âm cuối, thay âm, sai trọng âm, nói thiếu từ, mic nhiễu, im lặng; speaker không trùng giữa tập chỉnh ngưỡng và kiểm thử.
- ASR: WER, tỷ lệ hallucination trên im lặng, latency p50/p95; không đổi WER thành điểm accent.
- Assessment: precision/recall lỗi từng nhóm, mức đồng thuận với người chấm, false positive trên cách đọc Mỹ hợp lệ, latency và chi phí mỗi phút.
- Đề xuất cổng phát hành phản hồi âm: precision ≥ 85% trên tập giữ lại, báo cáo recall đi kèm; nếu số mẫu quá ít hoặc không đạt, chỉ phản hồi “cần nghe lại/kiểm tra” và dùng so sánh audio. Ngưỡng này cần hiệu chỉnh sau pilot.
- Không gộp điểm các provider khác thang đo thành một biểu đồ; đổi model phải ghi phiên bản và đánh giá lại.

## 7. Chi phí và phần còn thiếu

Không dự trù phí API hay thuê server trong phương án hiện tại. Chi phí thực tế còn lại: **điện máy cá nhân + dung lượng local + băng thông tải lần đầu + thời gian biên tập/kiểm tra nội dung**. TTS tạo trước giảm tạo lặp lại; local vẫn tốn tài nguyên và thời gian bảo trì. Không yêu cầu mua GPU hoặc dịch vụ chấm trước khi benchmark CPU/Mac.

Chưa nguồn nào ở đây đảm bảo đầy đủ nghĩa tiếng Việt, khẩu hình được minh họa đúng, nhãn CEFR cho từng nghĩa và hội thoại Mỹ theo giáo trình 90 ngày. Đây là công việc xây nội dung, cần nằm trong kế hoạch chứ không được xem là đã giải quyết bằng việc nhập repo.

Để định kỳ cập nhật: lưu release/commit, checksum của file nhập, model card, giấy phép và ngày kiểm tra. Các URL trên được đọc tại ngày đầu tài liệu; chưa ghim phiên bản hay đánh giá toàn bộ dependencies.
