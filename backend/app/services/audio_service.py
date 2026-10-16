"""Reference audio for a prompt (local TTS, cached)."""

from pathlib import Path

from app.errors import DomainError
from app.ml.tts import SpeechSynthesizer

MAX_TEXT = 200


class AudioService:
    """Validates the prompt and delegates to the synthesiser."""

    def __init__(self, synthesizer: SpeechSynthesizer) -> None:
        self._synthesizer = synthesizer

    def reference(self, text: str) -> Path:
        """WAV path for `text` (≤ 200 characters)."""
        if not text.strip() or len(text) > MAX_TEXT:
            raise DomainError("text must be 1-200 characters")
        return self._synthesizer.synthesize(text)
