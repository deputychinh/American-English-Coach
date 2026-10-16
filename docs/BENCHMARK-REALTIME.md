# Benchmark và đánh giá (2026-10-16)

Máy đo: Apple M4 Pro, 48 GB RAM, macOS 27.0.1, Python 3.12.15, torch (MPS). Model: `facebook/wav2vec2-xlsr-53-espeak-cv-ft` (`model_version = wav2vec2-xlsr-53-espeak-cv-ft@mps`). Mọi số dưới đây là **đo được trên máy này**; không suy rộng sang máy khác.

## 1. Độ trễ model âm vị (`make bench`)

Clip 2,83 s do `say` tạo (câu "I think this is the third time she sells fresh fish."), 10 vòng sau 1 vòng làm nóng. Nguồn: `data/bench/phoneme-mps.json`, `data/bench/phoneme-cpu.json`.

| Thiết bị | Tải + làm nóng | p50 | p95 |
|---|---:|---:|---:|
| MPS (GPU Apple) | 2,48 s | 0,032 s | 0,032 s |
| CPU | 0,40 s | 0,086 s | 0,088 s |

Cổng G1 của kế hoạch (p95 ≤ 1,5 s cho câu 3 s): **đạt** trên cả hai thiết bị. Độ trễ end-to-end của `/assess` còn thêm decode, pyin (prosody) và SQLite; đo ở §4 khi có.

## 2. Tập đối chứng tổng hợp (`uv run python -m app.eval.synthetic_contrast`)

Giọng `say`: Samantha, Eddy (English (US)). 68 lượt: mỗi từ đích đọc đúng + các cách đọc sai cố ý (ví dụ *think* ← "tink", "sink", "fink"). **TTS không phải dữ liệu người học**; bảng này chỉ kiểm tra pipeline im lặng khi đúng và phản ứng khi sai. Mọi phản ứng ở đây đều ở mức `check` vì `enabled_errors.json` rỗng (xem §3). Nguồn: `data/eval/synthetic_contrast.json`.

| error_id | Prompt đúng | Báo động giả (≠ ok) | Prompt sai | Phát hiện (≠ ok) | Gán đúng error_id | Tỷ lệ phát hiện |
|---|---:|---:|---:|---:|---:|---:|
| `ae_to_eh` | 2 | 1 | 2 | 1 | 1 | 0.50 |
| `ch_to_s_sh` | 2 | 2 | 4 | 4 | 3 | 1.00 |
| `dh_to_d_z` | 2 | 0 | 4 | 4 | 4 | 1.00 |
| `final_p_dropped` | 2 | 0 | 4 | 4 | 4 | 1.00 |
| `final_s_dropped` | 2 | 2 | 2 | 2 | 2 | 1.00 |
| `final_t_dropped` | 2 | 0 | 2 | 2 | 2 | 1.00 |
| `final_v_dropped` | 2 | 0 | 2 | 2 | 2 | 1.00 |
| `iy_to_ih` | 2 | 0 | 2 | 2 | 1 | 1.00 |
| `r_to_l` | 2 | 0 | 2 | 2 | 2 | 1.00 |
| `sh_to_s` | 2 | 1 | 2 | 2 | 2 | 1.00 |
| `th_to_t_s_f` | 2 | 1 | 6 | 5 | 3 | 0.83 |
| `uw_to_uh` | 2 | 2 | 2 | 2 | 0 | 1.00 |
| `v_to_w` | 2 | 0 | 4 | 4 | 3 | 1.00 |
| `w_to_v` | 2 | 0 | 2 | 2 | 2 | 1.00 |
| **Tổng** | 28 | 9 | 40 | 38 | | 0.95 |

Nhận xét:

- Báo động giả trên prompt đúng: 9/28 (32%), tất cả ở mức `check`, không có `error`. Nguyên nhân chính: token espeak ngoài bảng ánh xạ (`heard = ?`, ví dụ *she*, *chip* với giọng Samantha) và âm cuối /s/ trong *cats* bị bộ giải mã tham lam bỏ qua dù GOP = 0 (căn chỉnh ép vẫn thấy âm). Đề xuất cho session chính: khi `op ≠ match` nhưng GOP ≥ `GOP_OK_THRESHOLD`, trả `ok` thay vì `check` (tin căn chỉnh ép hơn giải mã tham lam); và coi `heard = ?` với GOP tốt là `ok`.
- Bỏ sót: *think* ← "fink" (Samantha) và *bad* ← "bed" (Samantha) không bị phát hiện; TTS có thể không tạo ra khác biệt âm học đủ lớn. Tỷ lệ phát hiện chung 95%.

## 3. speechocean762 (`uv run --with pyarrow python -m app.eval.speechocean`)

Tập test của speechocean762 qua mirror Hugging Face `mispeech/speechocean762` (CC BY 4.0). Lấy mẫu có seed 7: **250 câu, 125 người nói, 4757 âm vị** có điểm chuyên gia 0–2 (2 = đúng). **Người nói là trẻ em/người lớn Trung Quốc (L1 Mandarin), không phải người Việt**; số liệu chỉ hiệu chỉnh pipeline. Ngưỡng dùng: GOP ok ≥ -1.0, check ≥ -3.0. Nguồn: `data/eval/speechocean762.json`, chi tiết từng âm `data/eval/speechocean762-phones.json`.

| Chỉ số | Giá trị |
|---|---:|
| Pearson(GOP, điểm chuyên gia) | 0.436 |
| Spearman(GOP, điểm chuyên gia) | 0.327 |
| Âm chuyên gia chấm đúng (score 2) | 3888 |
| … pipeline không gọi `ok` (check hoặc error) | 23.4% |
| … pipeline sẽ gọi `error` nếu mọi lỗi được bật | 4.4% |

Precision/recall theo từng mục catalogue khi **giả định mục đó được bật** (`support` = số âm pipeline gọi `error` và gán cho mục; `precision` = phần chuyên gia cũng chấm < 2; `recall` = phần âm đích bị chuyên gia chấm < 2 mà pipeline bắt được):

| error_id | support | true positives | precision | recall | âm đích chuyên gia chấm sai |
|---|---:|---:|---:|---:|---:|
| `final_z_dropped` | 3 | 3 | 1.00 | 0.04 | 81 |
| `final_m_dropped` | 2 | 2 | 1.00 | 0.08 | 24 |
| `final_v_dropped` | 2 | 2 | 1.00 | 0.07 | 28 |
| `final_z_to_s` | 12 | 11 | 0.92 | 0.14 | 81 |
| `final_d_dropped` | 7 | 6 | 0.86 | 0.23 | 26 |
| `v_to_w` | 5 | 4 | 0.80 | 0.14 | 28 |
| `sh_to_s` | 3 | 2 | 0.67 | 0.22 | 9 |
| `final_t_dropped` | 3 | 2 | 0.67 | 0.04 | 57 |
| `l_to_n` | 3 | 2 | 0.67 | 0.05 | 38 |
| `iy_to_ih` | 4 | 2 | 0.50 | 0.04 | 45 |
| `final_s_dropped` | 2 | 1 | 0.50 | 0.04 | 22 |
| `r_to_l` | 7 | 3 | 0.43 | 0.13 | 23 |
| `ae_to_eh` | 19 | 7 | 0.37 | 0.27 | 26 |
| `th_to_t_s_f` | 21 | 7 | 0.33 | 0.64 | 11 |
| `uh_to_uw` | 21 | 7 | 0.33 | 0.35 | 20 |
| `dh_to_d_z` | 51 | 15 | 0.29 | 0.34 | 44 |
| `eh_to_ae` | 25 | 4 | 0.16 | 0.15 | 26 |
| `ih_to_iy` | 41 | 5 | 0.12 | 0.17 | 29 |
| `uw_to_uh` | 10 | 1 | 0.10 | 0.02 | 55 |
| `final_d_to_t` | 7 | 0 | 0.00 | 0.00 | 26 |
| `w_to_v` | 6 | 0 | 0.00 | 0.00 | 8 |
| `jh_to_z_ch` | 2 | 0 | 0.00 | 0.00 | 3 |
| `final_f_dropped` | 1 | 0 | 0.00 | 0.00 | 2 |
| `final_p_dropped` | 0 | 0 | 0.00 | 0.00 | 9 |
| `final_b_dropped` | 0 | 0 | 0.00 | 0.00 | 4 |
| `th_dropped` | 0 | 0 | 0.00 | 0.00 | 11 |
| `ch_to_s_sh` | 0 | 0 | 0.00 | 0.00 | 3 |
| `final_k_dropped` | 0 | 0 | 0.00 | 0.00 | 14 |
| `final_g_dropped` | 0 | 0 | 0.00 | 0.00 | 4 |

**Cổng precision ≥ 0.85 và support ≥ 15: không mục nào đạt → `content/enabled_errors.json = []`.** Mọi lỗi hiện ở mức `check` cho tới khi có dữ liệu tốt hơn. Gần đạt: `final_z_to_s` (0,92 nhưng support 12), `final_d_dropped` (0,86, support 7). Precision thấp ở nhóm nguyên âm (`ih_to_iy` 0,12, `eh_to_ae` 0,16) cho thấy giải mã tham lam + ánh xạ espeak nhầm nguyên âm gần nhau; cần GOP alignment-free/substitution-aware (Parikh 2025) trước khi bật.

Caveat: (1) nhãn speechocean là điểm 0–2 theo âm, không ghi âm thay thế trong mọi trường hợp, nên precision tính theo "chuyên gia cũng chấm chưa đúng" chứ không phải "đúng loại thay thế"; (2) L1 Mandarin có hồ sơ lỗi khác người Việt (ví dụ ít bỏ âm cuối /p b m/), nên support của nhóm ưu tiên 1 rất nhỏ; (3) 250 câu là mẫu nhỏ, lặp lại với `--limit 2500` khi có thời gian (~5 phút trên MPS).

## 4. Việc cần làm tiếp

- Đo độ trễ end-to-end `/assess` (decode + model + pyin + SQLite) trên 20 lượt thật.
- Chạy lại §3 với toàn bộ 2.500 câu và với L2-ARCTIC (4 người Việt) khi có link; ghi `model_version` cùng mọi bảng.
- Hiệu chỉnh ngưỡng GOP (-1 / -3) bằng đường ROC trên speechocean thay vì giá trị tay.

## 5. Quét ngưỡng GOP sau hai sửa đổi của session chính (2026-10-16)

Hai thay đổi sau §3: (1) `AssessmentService._audio_verdict` trả `ok` khi bộ giải mã tham lam nghe khác nhưng căn chỉnh ép vẫn ủng hộ âm đích (GOP ≥ `GOP_OK_THRESHOLD`); (2) `GopScorer` đưa **blank** vào mẫu số GOP, để âm bị bỏ (ví dụ phụ âm cuối rơi vào khoảng im lặng) không được điểm tốt chỉ vì mọi âm khác cũng khó xảy ra ở đó. Chạy lại `app.eval.speechocean` cùng 250 câu (seed 7) rồi quét trên `data/eval/speechocean762-phones.json` ("đúng" = chuyên gia chấm 2, n = 3888; "sai" = chấm < 1,5, n = 320). `GOP_CHECK_THRESHOLD` gần như không ảnh hưởng vì âm khớp luôn có GOP ≈ 0.

| `GOP_OK_THRESHOLD` | Không gọi `ok` trên âm đúng (báo động giả) | Bắt được âm sai | Precision của nhóm bị gắn cờ |
|---:|---:|---:|---:|
| -1,0 | 17,2% | 72,2% | 0,40 |
| -1,5 | 14,6% | 67,8% | 0,42 |
| **-2,0 (chọn)** | **12,5%** | **64,7%** | **0,44** |
| -3,0 | 8,2% | 58,1% | 0,50 |

Chọn -2,0: báo động giả tương đương mức -1,5 của luật cũ nhưng độ nhạy cao hơn. So với luật ban đầu (§3: 23,4% không gọi `ok` trên âm đúng), báo động giả giảm gần một nửa. Precision theo từng mục catalogue vẫn dưới 0,85 với support ≥ 15, nên `content/enabled_errors.json` vẫn rỗng và mọi lỗi hiện ở mức `check` cho đến khi có dữ liệu người Việt (ADR 0002).
