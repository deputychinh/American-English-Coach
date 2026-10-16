"""Deterministic test doubles for the heavy adapters."""

import json
from pathlib import Path

import numpy as np
from numpy.typing import NDArray

from app.domain.ports import PhonemeRecognizer

FIXTURES = Path(__file__).parent / "fixtures"
VOCAB: dict[str, int] = json.loads((FIXTURES / "vocab.json").read_text(encoding="utf-8"))


def posteriors_for(
    tokens: list[str], frames_per_token: int = 5, gap: int = 2
) -> NDArray[np.float32]:
    """Synthetic CTC log posteriors: each token peaks for a few frames, blanks in between."""
    blank = VOCAB["<pad>"]
    rows: list[NDArray[np.float32]] = []
    for token in tokens:
        for _ in range(gap):
            rows.append(_one_hot(blank))
        for _ in range(frames_per_token):
            rows.append(_one_hot(VOCAB[token]))
    for _ in range(gap):
        rows.append(_one_hot(blank))
    return np.stack(rows)


def _one_hot(column: int, peak: float = -0.01, floor: float = -12.0) -> NDArray[np.float32]:
    row = np.full(len(VOCAB), floor, dtype=np.float32)
    row[column] = peak
    return row


class FakeRecognizer(PhonemeRecognizer):
    """Returns a scripted posterior matrix regardless of the audio."""

    def __init__(self, tokens: list[str]) -> None:
        self.tokens = tokens
        self.calls = 0

    @property
    def vocab(self) -> dict[str, int]:
        return VOCAB

    @property
    def blank_id(self) -> int:
        return VOCAB["<pad>"]

    @property
    def model_version(self) -> str:
        return "fake@test"

    @property
    def frame_seconds(self) -> float:
        return 0.02

    def log_posteriors(self, waveform: NDArray[np.float32]) -> NDArray[np.float32]:
        self.calls += 1
        return posteriors_for(self.tokens)
