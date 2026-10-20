import json
from pathlib import Path

from fastapi.testclient import TestClient

from app.config.settings import Settings
from app.main import create_app
from tests.fakes import FakeRecognizer


def client_with_model(settings: Settings, tmp_path: Path) -> TestClient:
    model_dir = tmp_path / "models" / "wav2vec2"
    onnx = model_dir.parent / "onnx"
    onnx.mkdir(parents=True)
    (onnx / "w2v.mm8.onnx").write_bytes(b"onnx-bytes")
    manifest = {"files": {"w2v.mm8.onnx": {"bytes": 10, "sha256": "abc"}}}
    (onnx / "manifest.json").write_text(json.dumps(manifest), encoding="utf-8")
    app = create_app(settings.model_copy(update={"model_dir": model_dir}), FakeRecognizer(["a"]))
    return TestClient(app)


def test_serves_only_files_listed_in_the_manifest(settings: Settings, tmp_path: Path) -> None:
    with client_with_model(settings, tmp_path) as client:
        assert client.get("/api/v1/models/manifest").json()["files"]["w2v.mm8.onnx"]["bytes"] == 10
        assert client.get("/api/v1/models/w2v.mm8.onnx").content == b"onnx-bytes"
        assert client.get("/api/v1/models/manifest.json").status_code == 404
        assert client.get("/api/v1/models/..%2Fsecret").status_code == 404


def test_no_exported_model_is_a_404(client: TestClient) -> None:
    assert client.get("/api/v1/models/manifest").status_code == 404
