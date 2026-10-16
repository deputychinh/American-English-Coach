"""Shared fixtures: temp data dir, fake recogniser, test client and a synthetic WAV."""

import io
from collections.abc import Iterator
from pathlib import Path

import numpy as np
import pytest
import soundfile as sf
from fastapi.testclient import TestClient
from pydantic import SecretStr

from app.config.settings import REPO_ROOT, Settings
from app.main import create_app
from tests.fakes import FakeRecognizer


@pytest.fixture
def settings(tmp_path: Path) -> Settings:
    return Settings(
        data_dir=tmp_path / "data",
        content_dir=REPO_ROOT / "content",
        vendor_dir=REPO_ROOT / "vendor",
        web_dist_dir=None,
        llm_provider="none",
        llm_api_key=SecretStr(""),
    )


@pytest.fixture
def recognizer() -> FakeRecognizer:
    # "think" said correctly: θ ɪ ŋ k
    return FakeRecognizer(["θ", "ɪ", "ŋ", "k"])


@pytest.fixture
def client(settings: Settings, recognizer: FakeRecognizer) -> Iterator[TestClient]:
    with TestClient(create_app(settings, recognizer)) as test_client:
        yield test_client


def wav_bytes(seconds: float = 1.0, rate: int = 16_000, silent: bool = False) -> bytes:
    """A 16-bit PCM WAV with a quiet 150 Hz tone (voiced-looking, deterministic)."""
    t = np.arange(int(seconds * rate)) / rate
    signal = np.zeros_like(t) if silent else 0.2 * np.sin(2 * np.pi * 150 * t)
    buffer = io.BytesIO()
    sf.write(buffer, signal.astype(np.float32), rate, format="WAV", subtype="PCM_16")
    return buffer.getvalue()
