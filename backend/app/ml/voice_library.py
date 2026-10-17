"""Licensed human recordings for prompts; falls back to the synthesiser when none matches.

`content/voice/manifest.json` lists clips with their licence (see content/voice/README.md). Lookup
is by normalised text, so "Think!" and "think" share one clip.
"""

import json
import re
from pathlib import Path

NORMALISE = re.compile(r"[^a-z0-9' ]+")
MANIFEST_NAME = "manifest.json"


def normalise_text(text: str) -> str:
    """Lower-case, punctuation-free, single-spaced key for a prompt."""
    return " ".join(NORMALISE.sub(" ", text.lower()).split())


class VoiceLibrary:
    """Maps prompt text to a licensed clip path; empty when the manifest is missing."""

    def __init__(self, directory: Path) -> None:
        self._directory = directory
        self._clips: dict[str, Path] = {}
        self._licenses: dict[str, str] = {}
        manifest = directory / MANIFEST_NAME
        if not manifest.exists():
            return
        entries: list[dict[str, str]] = json.loads(manifest.read_text(encoding="utf-8"))
        for entry in entries:
            path = directory / entry["file"]
            if not path.exists():
                continue
            key = normalise_text(entry["text"])
            self._clips[key] = path
            self._licenses[key] = entry.get("license", "")

    def __len__(self) -> int:
        """Number of usable clips."""
        return len(self._clips)

    def find(self, text: str) -> Path | None:
        """Clip for `text`, or None."""
        return self._clips.get(normalise_text(text))

    def license_of(self, text: str) -> str | None:
        """Licence string of the matching clip, for attribution screens."""
        return self._licenses.get(normalise_text(text))
