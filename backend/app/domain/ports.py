"""Abstract collaborators the domain depends on; adapters live in `app.ml` and tests."""

from abc import ABC, abstractmethod

import numpy as np
from numpy.typing import NDArray


class PhonemeRecognizer(ABC):
    """A CTC phoneme recogniser: frames of log posteriors over an espeak-style vocabulary."""

    @property
    @abstractmethod
    def vocab(self) -> dict[str, int]:
        """Token → column index of the posterior matrix (includes the blank `<pad>`)."""

    @property
    @abstractmethod
    def blank_id(self) -> int:
        """Column of the CTC blank."""

    @property
    @abstractmethod
    def model_version(self) -> str:
        """Identifier stored with every result so scores from different models are never mixed."""

    @property
    @abstractmethod
    def frame_seconds(self) -> float:
        """Duration of one posterior frame."""

    @abstractmethod
    def log_posteriors(self, waveform: NDArray[np.float32]) -> NDArray[np.float32]:
        """Run the model on 16 kHz mono audio; returns a (frames x vocab) log-softmax matrix."""
