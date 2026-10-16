"""Reference audio from the macOS `say` command, cached as 16 kHz WAV files."""

import hashlib
import re
import shutil
import subprocess
from pathlib import Path

from app.constants import SAMPLE_RATE
from app.errors import TtsUnavailableError

SAFE_TEXT = re.compile(r"[^A-Za-z0-9 ,.'?!-]")


class SpeechSynthesizer:
    """Synthesises a phrase once per (voice, text) and returns the cached file path."""

    def __init__(self, cache_dir: Path, voice: str) -> None:
        self._cache_dir = cache_dir
        self._voice = voice

    def synthesize(self, text: str) -> Path:
        """Return a WAV for `text`, generating it with `say` on first request."""
        clean = SAFE_TEXT.sub("", text).strip()
        if not clean:
            raise TtsUnavailableError("nothing to synthesise")
        key = hashlib.sha1(f"{self._voice}|{clean}".encode()).hexdigest()  # noqa: S324 - cache key
        target = self._cache_dir / f"{key}.wav"
        if target.exists():
            return target
        if shutil.which("say") is None:
            raise TtsUnavailableError("macOS `say` is not available on this machine")
        self._cache_dir.mkdir(parents=True, exist_ok=True)
        command = [
            "say", "-v", self._voice, "-o", str(target),
            f"--data-format=LEI16@{SAMPLE_RATE}", clean,
        ]  # fmt: skip
        completed = subprocess.run(command, capture_output=True, text=True, check=False, timeout=30)  # noqa: S603 - fixed argv, sanitised text
        if completed.returncode != 0 or not target.exists():
            raise TtsUnavailableError(completed.stderr.strip() or "say failed")
        return target
