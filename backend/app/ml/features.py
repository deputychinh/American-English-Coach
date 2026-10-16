"""Pitch and energy tracks for prosody analysis (librosa)."""

from dataclasses import dataclass

import librosa
import numpy as np
from numpy.typing import NDArray

from app.constants import SAMPLE_RATE

HOP = 160  # 10 ms at 16 kHz


@dataclass(frozen=True, slots=True)
class ProsodyTracks:
    """Frame-level f0 (Hz, NaN when unvoiced) and RMS energy, both at `hop_seconds`."""

    f0: NDArray[np.float64]
    rms: NDArray[np.float64]
    hop_seconds: float


class ProsodyFeatureExtractor:
    """pYIN pitch tracking plus RMS energy; deterministic for a given waveform."""

    def extract(self, waveform: NDArray[np.float32]) -> ProsodyTracks:
        """Compute the tracks for 16 kHz mono audio."""
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
