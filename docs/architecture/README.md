# Kiến trúc

Một máy, hai tiến trình khi phát triển (API :8765, web :3200), một tiến trình khi dùng (`make serve`: API phục vụ cả web tĩnh).

```mermaid
flowchart LR
    subgraph Browser["Trình duyệt (Next.js static export)"]
        cam[Camera 30 fps] --> mp[MediaPipe Face Landmarker<br/>WASM local · 478 landmark · 52 blendshape]
        mp --> feat[mouth-features.util<br/>6 đặc trưng · chuẩn hóa theo hiệu chỉnh]
        feat --> mirror[Gương khẩu hình<br/>thanh đo · gợi ý tiếng Việt]
        mic[Micro] --> worklet[AudioWorklet<br/>PCM 16 kHz → WAV]
        worklet --> post
        feat -->|"chuỗi {t, features, quality}<br/>KHÔNG video"| post[POST /api/v1/assess]
        post --> card[Thẻ kết quả<br/>âm · khẩu hình · ngữ điệu]
    end

    subgraph API["FastAPI · backend/app"]
        post --> routes[routes/assess.py]
        routes --> svc[services/assessment_service.py]
        svc --> dec[ml/audio.py<br/>decode + resample]
        svc --> rec[ml/recognizer.py<br/>wav2vec2 CTC · MPS/CPU]
        svc --> dict[domain/pronouncing.py<br/>CMUdict → ARPAbet + stress]
        rec --> gop[domain/gop_scorer.py<br/>forced alignment · GOP]
        rec --> dec2[domain/ctc_decoder.py<br/>greedy → espeak IPA]
        dec2 --> map[domain/phoneme_inventory.py<br/>espeak → 39 âm]
        map --> al[domain/aligner.py<br/>Needleman-Wunsch]
        al --> cat[domain/error_catalog.py<br/>content/vn_errors.json]
        gop --> verdict[ok / check / error]
        cat --> verdict
        svc --> vis[domain/viseme.py<br/>content/visemes.json]
        vis --> fuse[domain/fusion.py]
        verdict --> fuse
        svc --> pros[ml/features.py + domain/prosody.py<br/>pyin · RMS · trọng âm · ngữ điệu · nhịp]
        fuse --> resp[schemas/assessment.py]
        pros --> resp
        resp --> repo[repositories/results_repository.py]
        repo --> db[(data/coach.sqlite3)]
        content[routes/content.py] --> cs[services/content_service.py] --> files[(content/*.json, *.tsv)]
        audio[routes/audio.py] --> tts[ml/tts.py · macOS say] --> cache[(data/audio/*.wav)]
        progress[routes/progress.py + calibration] --> repo
    end
```

## Luồng một lượt luyện

1. Web tải `GET /content/visemes` (mục tiêu khẩu hình, bước hiệu chỉnh) và `GET /calibration`.
2. Người học bấm ghi: AudioWorklet thu PCM 16 kHz; cùng lúc MediaPipe chạy mỗi khung, `mouth-features` tính `aperture, width, roundness, jaw, lipClosed, lowerLipTuck` (chuẩn hóa 0–1 theo min/max hiệu chỉnh) và `quality` (góc mặt, có mặt).
3. Khi dừng: web gửi multipart `audio` (WAV), `text`, `item_id`, `kind`, `mouth_frames` (JSON), `audio_started_at` (cùng gốc `performance.now()` với `t` của khung).
4. API: decode → CMUdict (chọn biến thể gần nhất với chuỗi nghe được) → wav2vec2 → GOP + căn chỉnh → catalogue → verdict audio → cắt cửa sổ khung hình theo mốc thời gian âm vị (±60 ms) → viseme → fusion → prosody → lưu → trả `AssessmentResponse`.
5. Web vẽ dòng thời gian từ/âm, tô theo mức, bấm âm xem gợi ý; nút “Tôi nói đúng mà” gọi `POST /runs/{id}/dispute`.

## Mô hình dữ liệu (SQLite)

| Bảng | Trường chính |
|---|---|
| `assessment_runs` | `id` (uuid), `item_id`, `text`, `model_version`, `created_at`, `ok_count/check_count/error_count`, `result_json`, `disputed` |
| `phoneme_results` | `run_id` → runs, `word`, `phoneme` (ARPAbet), `verdict`, `gop`, `visual`, `error_id` |
| `calibrations` | `id='default'`, `data_json` (min/max mỗi đặc trưng), `created_at` |

Lược đồ được tạo bằng `metadata.create_all` khi khởi động (một người dùng, một file); đổi lược đồ phá vỡ tương thích phải kèm script di trú và ADR.

## Quy ước lớp

- `domain/`: thuần Python + numpy, không framework, không I/O ngoài đọc `content/`. Test exhaustively.
- `ml/`: adapter quanh torch/librosa/soundfile/`say`; implement port `domain/ports.py`. Test bằng `FakeRecognizer`.
- `services/`: use case; một phương thức công khai mỗi use case; nhận collaborator qua constructor.
- `routes/`: validate → gọi một service → trả model. Lỗi domain đổi sang problem+json một lần ở `main.py`.
- `container.py`: composition root (lazy singletons); test truyền `recognizer` giả.
