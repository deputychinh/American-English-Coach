"""wav2vec2 CTC phoneme recogniser on ONNX Runtime: the same model the iPhone app runs.

Used to check, on the Mac, that the exported and quantized model scores like the PyTorch one
(`make sweep` and the speechocean evaluation with `COACH_RECOGNIZER=onnx`).
"""

import json
import threading
from pathlib import Path

import numpy as np
from numpy.typing import NDArray

from app.constants import CTC_FRAME_SECONDS
from app.domain.ports import PhonemeRecognizer
from app.errors import ModelUnavailableError

# Wav2Vec2FeatureExtractor normalisation: zero mean, unit variance per utterance.
NORMALISE_EPSILON = 1e-7


def normalise(waveform: NDArray[np.float32]) -> NDArray[np.float32]:
    """Zero-mean, unit-variance audio, as the model was trained on."""
    centred = waveform - waveform.mean()
    scaled: NDArray[np.float32] = (centred / np.sqrt(centred.var() + NORMALISE_EPSILON)).astype(
        np.float32
    )
    return scaled


def log_softmax(logits: NDArray[np.float32]) -> NDArray[np.float32]:
    """Row-wise log-softmax, numerically stable."""
    shifted = logits - logits.max(axis=-1, keepdims=True)
    result: NDArray[np.float32] = (
        shifted - np.log(np.exp(shifted).sum(axis=-1, keepdims=True))
    ).astype(np.float32)
    return result


class OnnxRecognizer(PhonemeRecognizer):
    """Loads the ONNX model lazily; one inference at a time, like the PyTorch recogniser."""

    def __init__(self, model_path: Path, vocab_path: Path) -> None:
        self._model_path = model_path
        self._vocab_path = vocab_path
        self._lock = threading.Lock()
        self._session: object | None = None
        self._vocab: dict[str, int] = {}

    @property
    def vocab(self) -> dict[str, int]:
        """Token → column, read from the model's `vocab.json`."""
        if not self._vocab:
            if not self._vocab_path.exists():
                raise ModelUnavailableError(f"vocab missing at {self._vocab_path}")
            self._vocab = json.loads(self._vocab_path.read_text(encoding="utf-8"))
        return self._vocab

    @property
    def blank_id(self) -> int:
        """The `<pad>` token is the CTC blank for wav2vec2."""
        return self.vocab["<pad>"]

    @property
    def model_version(self) -> str:
        """File stem plus runtime, e.g. `w2v.mm8@onnx`."""
        return f"{self._model_path.stem}@onnx"

    @property
    def frame_seconds(self) -> float:
        """wav2vec2 emits one frame per 20 ms."""
        return CTC_FRAME_SECONDS

    def log_posteriors(self, waveform: NDArray[np.float32]) -> NDArray[np.float32]:
        """Log-softmax over the vocabulary for every frame."""
        session = self._ensure_loaded()
        inputs = normalise(waveform.astype(np.float32))[None, :]
        with self._lock:
            (logits,) = session.run(None, {"input_values": inputs})  # type: ignore[attr-defined]
        return log_softmax(np.asarray(logits[0], dtype=np.float32))

    def _ensure_loaded(self) -> object:
        if self._session is None:
            with self._lock:
                if self._session is None:
                    if not self._model_path.exists():
                        raise ModelUnavailableError(
                            f"ONNX model missing at {self._model_path}; run scripts/export_onnx.py"
                        )
                    import onnxruntime as ort  # noqa: PLC0415 - dev-only dependency

                    self._session = ort.InferenceSession(
                        str(self._model_path), providers=["CPUExecutionProvider"]
                    )
        return self._session
