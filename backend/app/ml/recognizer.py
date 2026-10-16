"""wav2vec2 CTC phoneme recogniser (PyTorch) implementing the `PhonemeRecognizer` port."""

import json
import logging
import threading
from pathlib import Path
from typing import cast

import numpy as np
import torch
from numpy.typing import NDArray
from transformers import Wav2Vec2FeatureExtractor, Wav2Vec2ForCTC

from app.constants import CTC_FRAME_SECONDS, SAMPLE_RATE
from app.domain.ports import PhonemeRecognizer
from app.errors import ModelUnavailableError

logger = logging.getLogger(__name__)


def pick_device(preference: str) -> torch.device:
    """Resolve `auto` to MPS on Apple Silicon, CUDA when present, else CPU."""
    if preference != "auto":
        return torch.device(preference)
    if torch.backends.mps.is_available():
        return torch.device("mps")
    if torch.cuda.is_available():
        return torch.device("cuda")
    return torch.device("cpu")


class Wav2Vec2Recognizer(PhonemeRecognizer):
    """Loads the model lazily on first use; one inference at a time (plan D6)."""

    def __init__(self, model_dir: Path, device: str = "auto") -> None:
        self._model_dir = model_dir
        self._device = pick_device(device)
        self._lock = threading.Lock()
        self._model: Wav2Vec2ForCTC | None = None
        self._extractor: Wav2Vec2FeatureExtractor | None = None
        self._vocab: dict[str, int] = {}

    @property
    def vocab(self) -> dict[str, int]:
        """Token → column, read from the model's `vocab.json`."""
        self._ensure_loaded()
        return self._vocab

    @property
    def blank_id(self) -> int:
        """The `<pad>` token is the CTC blank for wav2vec2."""
        return self.vocab["<pad>"]

    @property
    def model_version(self) -> str:
        """Model directory name plus device, e.g. `wav2vec2-xlsr-53-espeak-cv-ft@mps`."""
        return f"{self._model_dir.name}@{self._device.type}"

    @property
    def frame_seconds(self) -> float:
        """wav2vec2 emits one frame per 20 ms."""
        return CTC_FRAME_SECONDS

    def log_posteriors(self, waveform: NDArray[np.float32]) -> NDArray[np.float32]:
        """Log-softmax over the vocabulary for every frame."""
        self._ensure_loaded()
        if self._model is None or self._extractor is None:  # pragma: no cover - loaded above
            raise ModelUnavailableError("phoneme model failed to load")
        inputs = self._extractor(waveform, sampling_rate=SAMPLE_RATE, return_tensors="pt")
        features = inputs.input_values.to(self._device)
        with self._lock, torch.inference_mode():
            logits = self._model(features).logits[0]
            log_probs = torch.log_softmax(logits.float(), dim=-1)
        result: NDArray[np.float32] = log_probs.cpu().numpy().astype(np.float32)
        return result

    def _ensure_loaded(self) -> None:
        if self._model is not None:
            return
        with self._lock:
            if self._model is not None:
                return
            vocab_path = self._model_dir / "vocab.json"
            if not vocab_path.exists():
                raise ModelUnavailableError(
                    f"phoneme model missing at {self._model_dir}; run `make models`"
                )
            self._vocab = json.loads(vocab_path.read_text(encoding="utf-8"))
            self._extractor = Wav2Vec2FeatureExtractor.from_pretrained(self._model_dir)
            module: torch.nn.Module = Wav2Vec2ForCTC.from_pretrained(self._model_dir)
            module.eval()
            self._model = cast("Wav2Vec2ForCTC", module.to(self._device))
            logger.info("phoneme model loaded", extra={"device": self._device.type})
