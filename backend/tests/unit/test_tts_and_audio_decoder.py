from pathlib import Path

import pytest

from app.errors import AudioInvalidError, AudioTooLongError, TtsUnavailableError
from app.ml.audio import AudioDecoder
from app.ml.tts import SpeechSynthesizer
from tests.conftest import wav_bytes


def test_decoder_resamples_and_validates() -> None:
    decoder = AudioDecoder()
    assert decoder.decode(wav_bytes(1.0, rate=48_000)).shape[0] == 16_000
    with pytest.raises(AudioTooLongError):
        decoder.decode(wav_bytes(16.0))
    with pytest.raises(AudioInvalidError):
        decoder.decode(wav_bytes(0.1))
    with pytest.raises(AudioInvalidError):
        decoder.decode(b"garbage")


def test_synthesizer_rejects_empty_text_and_missing_say(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    synth = SpeechSynthesizer(tmp_path, "Samantha")
    with pytest.raises(TtsUnavailableError):
        synth.synthesize("@@@")
    monkeypatch.setattr("app.ml.tts.shutil.which", lambda _name: None)
    with pytest.raises(TtsUnavailableError):
        synth.synthesize("hello")
