"""Licensed clips win over TTS; missing files and manifests degrade to the synthesiser."""

import json
from pathlib import Path

import pytest

from app.errors import TtsUnavailableError
from app.ml.tts import SpeechSynthesizer
from app.ml.voice_library import VoiceLibrary, normalise_text
from app.services.audio_service import AudioService


def test_normalise_text_matches_prompts_regardless_of_case_and_punctuation() -> None:
    assert normalise_text("Think!") == "think"
    assert normalise_text("  Do you LIKE  coffee? ") == "do you like coffee"
    assert normalise_text("don't") == "don't"


def test_library_serves_matching_clips_and_skips_missing_files(tmp_path: Path) -> None:
    (tmp_path / "think.wav").write_bytes(b"RIFF")
    (tmp_path / "manifest.json").write_text(
        json.dumps(
            [
                {"text": "Think", "file": "think.wav", "license": "CC BY 4.0"},
                {"text": "sink", "file": "missing.wav", "license": "CC0"},
            ]
        ),
        encoding="utf-8",
    )
    library = VoiceLibrary(tmp_path)
    assert len(library) == 1
    assert library.find("think!") == tmp_path / "think.wav"
    assert library.license_of("THINK") == "CC BY 4.0"
    assert library.find("sink") is None
    assert len(VoiceLibrary(tmp_path / "nope")) == 0


def test_audio_service_prefers_the_human_clip(tmp_path: Path) -> None:
    (tmp_path / "think.wav").write_bytes(b"RIFF")
    (tmp_path / "manifest.json").write_text(
        json.dumps([{"text": "think", "file": "think.wav"}]), encoding="utf-8"
    )

    class NoSay(SpeechSynthesizer):
        def synthesize(self, text: str) -> Path:
            raise TtsUnavailableError("no say")

    service = AudioService(NoSay(tmp_path / "cache", "Samantha"), VoiceLibrary(tmp_path))
    assert service.reference("Think") == tmp_path / "think.wav"
    assert service.is_human("think") is True
    assert service.is_human("sink") is False
    with pytest.raises(TtsUnavailableError):
        service.reference("sink")
