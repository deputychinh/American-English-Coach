# Kiểm thử

## Tầng

| Tầng                                                         | Ở đâu                                                                        | Cách chạy                                | Ngưỡng                              |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------- | ---------------------------------------- | ----------------------------------- |
| Domain (căn chỉnh, GOP, catalogue, viseme, prosody, từ điển) | `backend/tests/unit`                                                         | `cd backend && uv run pytest tests/unit` | nằm trong coverage chung ≥ 90 %     |
| API (FastAPI + `FakeRecognizer`)                             | `backend/tests/api`                                                          | `uv run pytest tests/api`                | như trên                            |
| Web unit/component                                           | `web/src/**/*.test.ts(x)`                                                    | `cd web && npm test`                     | dòng ≥ 80 %                         |
| Hành trình trình duyệt                                       | `web/e2e` (Playwright, camera/mic giả: `--use-fake-device-for-media-stream`) | `make e2e` sau `make serve`              | smoke: chọn bài → ghi → thẻ kết quả |
| Legacy                                                       | `legacy/tests`                                                               | `make test-legacy`                       | 33 unittest + 2 node test pass      |
| Chất lượng model (không phải test tự động)                   | `backend/app/eval/*`                                                         | `make bench`, `make eval`                | xem `docs/BENCHMARK-REALTIME.md`    |
| Pilot người Việt (người chấm tay)                            | `backend/app/eval/pilot.py`                                                  | `make pilot-export`, `make pilot-report` | precision ≥ 0,85, ≥ 20 dòng/lỗi     |
| Tiếp cận (axe-core, serious/critical = 0)                    | `web/e2e/a11y.spec.ts`                                                       | `make e2e`                               | 9 trang, 2 kích cỡ                  |

`make ci` = lint + typecheck + test của backend và web; đây cũng là những gì GitHub Actions chạy (`.github/workflows/ci.yml`).

## Nguyên tắc

- `FakeRecognizer` (`backend/tests/fakes.py`) trả ma trận posterior kịch bản sẵn từ `tests/fixtures/vocab.json` (vocab thật của model), nên test API không cần torch hay model đã tải và chạy trong vài giây.
- Test mô tả hành vi (`test_th_said_as_t_is_check_when_the_error_is_not_enabled`), một hành vi mỗi test, Arrange–Act–Assert.
- Bảng chân trị của fusion và toàn bộ bảng ánh xạ ký hiệu được test đầy đủ (mọi token tiếng Anh trong vocab model phải có ánh xạ; mọi đích ánh xạ phải là một trong 39 âm).
- Dữ liệu thật dùng trong test: `content/*` và `vendor/cmudict.dict` (nằm trong repo). Dataset và model không nằm trong test.
- Cảnh báo là lỗi (`filterwarnings = error`), trừ các cảnh báo deprecation của torch/transformers được liệt kê rõ.

## Những gì test không chứng minh

- Độ chính xác trên giọng người Việt thật: cần pilot với bản ghi có đồng ý và người chấm độc lập (xem HANDOFF).
- Hành vi camera/mic trên thiết bị thật và Safari: smoke test tay có ảnh chụp trong `docs/VERIFICATION.md`.
