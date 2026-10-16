import shutil

import pytest
from fastapi.testclient import TestClient


@pytest.mark.skipif(shutil.which("say") is None, reason="macOS say not available")
def test_reference_audio_is_cached_wav(client: TestClient) -> None:
    first = client.get("/api/v1/audio", params={"text": "think"})
    assert first.status_code == 200
    assert first.headers["content-type"] == "audio/wav"
    assert first.content[:4] == b"RIFF"
    second = client.get("/api/v1/audio", params={"text": "think"})
    assert second.content == first.content


def test_empty_or_long_text_is_rejected(client: TestClient) -> None:
    assert client.get("/api/v1/audio", params={"text": " "}).status_code == 400
    assert client.get("/api/v1/audio", params={"text": "a" * 201}).status_code == 400
