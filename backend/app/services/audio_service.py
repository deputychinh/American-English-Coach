"""Reference audio for a prompt: a licensed human clip when one exists, else local TTS (cached)."""

from pathlib import Path

from app.errors import DomainError
from app.ml.tts import SpeechSynthesizer
from app.ml.voice_library import VoiceLibrary

MAX_TEXT = 200


class AudioService:
    """Validates the prompt, prefers the voice library, then delegates to the synthesiser."""

    def __init__(self, synthesizer: SpeechSynthesizer, library: VoiceLibrary) -> None:
        self._synthesizer = synthesizer
        self._library = library

    def reference(self, text: str) -> Path:
        """WAV path for `text` (≤ 200 characters)."""
        if not text.strip() or len(text) > MAX_TEXT:
            raise DomainError("text must be 1-200 characters")
        clip = self._library.find(text)
        if clip is not None:
            return clip
        return self._synthesizer.synthesize(text)

    def is_human(self, text: str) -> bool:
        """Whether a licensed human clip backs this prompt."""
        return self._library.find(text) is not None
