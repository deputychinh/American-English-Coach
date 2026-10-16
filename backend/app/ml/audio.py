"""Decode uploaded audio into 16 kHz mono float32 and validate its length."""

import io

import librosa
import numpy as np
import soundfile as sf
from numpy.typing import NDArray

from app.constants import MAX_AUDIO_SECONDS, MIN_SPEECH_SECONDS, SAMPLE_RATE, SILENCE_PEAK
from app.errors import AudioInvalidError, AudioTooLongError


class AudioDecoder:
    """Turns WAV/FLAC/OGG bytes into the waveform the recogniser expects."""

    def decode(self, payload: bytes) -> NDArray[np.float32]:
        """Decode, down-mix to mono, resample to 16 kHz and check the duration bounds."""
        try:
            data, rate = sf.read(io.BytesIO(payload), dtype="float32", always_2d=True)
        except (sf.LibsndfileError, RuntimeError, ValueError) as error:
            raise AudioInvalidError("audio could not be decoded; send 16-bit PCM WAV") from error
        mono: NDArray[np.float32] = data.mean(axis=1).astype(np.float32)
        if rate != SAMPLE_RATE:
            mono = librosa.resample(mono, orig_sr=rate, target_sr=SAMPLE_RATE).astype(np.float32)
        seconds = mono.shape[0] / SAMPLE_RATE
        if seconds > MAX_AUDIO_SECONDS:
            raise AudioTooLongError(
                f"audio is {seconds:.1f}s; the limit is {MAX_AUDIO_SECONDS:.0f}s"
            )
        if seconds < MIN_SPEECH_SECONDS or float(np.abs(mono).max(initial=0.0)) < SILENCE_PEAK:
            raise AudioInvalidError("audio is too short or silent")
        return mono
