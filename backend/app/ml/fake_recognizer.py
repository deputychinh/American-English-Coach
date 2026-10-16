"""A scripted recogniser for CI and demos: no model download, deterministic output."""

import json
from pathlib import Path

import numpy as np
from numpy.typing import NDArray

from app.constants import CTC_FRAME_SECONDS
from app.domain.ports import PhonemeRecognizer

FRAMES_PER_TOKEN = 5
GAP_FRAMES = 2
PEAK = -0.01
FLOOR = -12.0


class FakeRecognizer(PhonemeRecognizer):
    """Emits one peaky CTC segment per scripted token (default: a well-said "think")."""

    def __init__(self, vocab_path: Path, tokens: list[str] | None = None) -> None:
        self._vocab: dict[str, int] = json.loads(vocab_path.read_text(encoding="utf-8"))
        self._tokens = tokens or ["θ", "ɪ", "ŋ", "k"]

    @property
    def vocab(self) -> dict[str, int]:
        """The real model's vocabulary, bundled with the tests."""
        return self._vocab

    @property
    def blank_id(self) -> int:
        """CTC blank."""
        return self._vocab["<pad>"]

    @property
    def model_version(self) -> str:
        """Marks every stored result as fake so it is never mixed with real scores."""
        return "fake-recognizer@ci"

    @property
    def frame_seconds(self) -> float:
        """Same frame rate as the real model."""
        return CTC_FRAME_SECONDS

    def log_posteriors(self, waveform: NDArray[np.float32]) -> NDArray[np.float32]:
        """Scripted posteriors, independent of the audio content."""
        rows: list[NDArray[np.float32]] = []
        for token in self._tokens:
            column = self._vocab.get(token, self.blank_id)
            rows.extend(self._one_hot(self.blank_id) for _ in range(GAP_FRAMES))
            rows.extend(self._one_hot(column) for _ in range(FRAMES_PER_TOKEN))
        rows.extend(self._one_hot(self.blank_id) for _ in range(GAP_FRAMES))
        _ = waveform
        return np.stack(rows)

    def _one_hot(self, column: int) -> NDArray[np.float32]:
        row = np.full(len(self._vocab), FLOOR, dtype=np.float32)
        row[column] = PEAK
        return row
