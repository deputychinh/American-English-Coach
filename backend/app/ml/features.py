"""Pitch and energy tracks for prosody analysis (librosa)."""

import threading
from collections.abc import Callable
from dataclasses import dataclass
from typing import TypeVar

import librosa
import numpy as np
from numpy.typing import NDArray

from app.constants import SAMPLE_RATE

HOP = 160  # 10 ms at 16 kHz

T = TypeVar("T")


@dataclass(frozen=True, slots=True)
class ProsodyTracks:
    """Frame-level f0 (Hz, NaN when unvoiced) and RMS energy, both at `hop_seconds`."""

    f0: NDArray[np.float64]
    rms: NDArray[np.float64]
    hop_seconds: float


class FirstCallGate:
    """Serialises calls until one succeeds, then lets them run concurrently.

    numba compiles librosa's kernels on first use; two threads compiling at once fail with
    "compilation disabled" (seen when the start-up warm-up met the first scoring request).
    """

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._is_open = False

    def run(self, call: Callable[[], T]) -> T:
        """Runs `call`, holding the lock only until the first call has succeeded."""
        if self._is_open:
            return call()
        with self._lock:
            result = call()
            self._is_open = True
            return result


_PYIN_GATE = FirstCallGate()


class ProsodyFeatureExtractor:
    """pYIN pitch tracking plus RMS energy; deterministic for a given waveform."""

    def extract(self, waveform: NDArray[np.float32]) -> ProsodyTracks:
        """Compute the tracks for 16 kHz mono audio (thread-safe, including the first call)."""
        return _PYIN_GATE.run(lambda: self._extract(waveform))

    def _extract(self, waveform: NDArray[np.float32]) -> ProsodyTracks:
        f0, _, _ = librosa.pyin(
            waveform, fmin=65.0, fmax=400.0, sr=SAMPLE_RATE, frame_length=1024, hop_length=HOP
        )
        rms = librosa.feature.rms(y=waveform, frame_length=1024, hop_length=HOP)[0]
        length = min(len(f0), len(rms))
        return ProsodyTracks(
            f0=np.asarray(f0[:length], dtype=np.float64),
            rms=np.asarray(rms[:length], dtype=np.float64),
            hop_seconds=HOP / SAMPLE_RATE,
        )
