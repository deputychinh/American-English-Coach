# Legacy app (stdlib Python + vanilla JS)

The first version of American English Coach (October 2026): a zero-dependency local server with the
44-sound chart, the 466,550-word dictionary, listening dictation and the 90-day schedule. It is kept
runnable for reference while the dictionary and dictation features are ported to `backend/` + `web/`.

```sh
cd legacy && python3 app.py          # http://127.0.0.1:8765 (same port as the new API; run one at a time)
make test-legacy                      # from the repository root
```

It reads `content/`, `vendor/` and `data/` from the repository root. New work happens in
`backend/` (FastAPI) and `web/` (Next.js); see the root README.
