"""Write the data the in-app (TypeScript) scorer needs, from the same sources as the API.

Outputs `web/src/data/scoring/`:
- `vocab.json`: model token → column (from the exported ONNX model);
- `lexicon.json`: CMUdict entries for every word that appears in `content/` (ARPAbet + stress);
- `errors.json`, `enabled.json`: the Vietnamese error catalogue and the precision-gated ids;
- `visemes.json`: groups with sounds, target ranges, confidence and hints;
- `inventory.json`: the phone tables of `app/domain/phoneme_inventory.py` (single source).

Run after changing content: `uv run python scripts/build_scoring_data.py`.
A unit test fails when the committed files are out of date.
"""

import json
from pathlib import Path
from typing import Any

from app.domain import phoneme_inventory as inv
from app.domain.pronouncing import PronouncingDictionary

ROOT = Path(__file__).resolve().parents[3]

CONTENT = ROOT / "content"
OUT = ROOT / "web" / "src" / "data" / "scoring"
VOCAB = ROOT / "backend" / "app" / "resources" / "vocab.json"


def strings(value: object) -> list[str]:
    """Every string inside a JSON value."""
    if isinstance(value, str):
        return [value]
    if isinstance(value, dict):
        return [s for item in value.values() for s in strings(item)]
    if isinstance(value, list):
        return [s for item in value for s in strings(item)]
    return []


def content_words(dictionary: PronouncingDictionary) -> list[str]:
    """Words of every content file (JSON and TSV) that the dictionary knows."""
    words: set[str] = set()
    for path in sorted(CONTENT.rglob("*")):
        if path.suffix == ".json":
            texts = strings(json.loads(path.read_text(encoding="utf-8")))
        elif path.suffix == ".tsv":
            texts = [path.read_text(encoding="utf-8")]
        else:
            continue
        for text in texts:
            words.update(w for w in dictionary.tokenize(text) if dictionary.lookup(w))
    return sorted(words)


def lexicon(dictionary: PronouncingDictionary) -> dict[str, list[list[str]]]:
    """Word → variants → CMUdict tokens (`AH0`, `T`)."""
    result: dict[str, list[list[str]]] = {}
    for word in content_words(dictionary):
        entry = dictionary.lookup(word)
        if entry is None:
            continue
        result[word] = [
            [f"{p.symbol}{p.stress}" if p.stress is not None else p.symbol for p in variant]
            for variant in entry.variants
        ]
    return result


def write(name: str, value: object) -> None:
    """Compact JSON with sorted keys so diffs stay small and reviewable."""
    text = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    (OUT / name).write_text(text + "\n", encoding="utf-8")


def build() -> dict[str, Any]:
    """Everything as one dict (also used by the freshness test)."""
    dictionary = PronouncingDictionary.load(ROOT / "vendor" / "cmudict.dict")
    visemes = json.loads((CONTENT / "visemes.json").read_text(encoding="utf-8"))
    enabled_path = CONTENT / "enabled_errors.json"
    return {
        "vocab.json": json.loads(VOCAB.read_text(encoding="utf-8")),
        "lexicon.json": lexicon(dictionary),
        "errors.json": json.loads((CONTENT / "vn_errors.json").read_text(encoding="utf-8")),
        "enabled.json": json.loads(enabled_path.read_text(encoding="utf-8")),
        "visemes.json": {"features": visemes["features"], "groups": visemes["groups"]},
        "inventory.json": {
            "classes": {k: v.value for k, v in inv.ARPABET_CLASSES.items()},
            "order": list(inv.ARPABET),
            "ipa": inv.ARPABET_IPA,
            "unstressedIpa": inv.UNSTRESSED_IPA,
            "espeak": {k: list(v) for k, v in inv.ESPEAK_TO_ARPABET.items()},
            "espeakOrder": list(inv.ESPEAK_TO_ARPABET),
            "nearest": {k: list(v) for k, v in inv.NEAREST_ENGLISH.items()},
            "diacritics": list(inv.DIACRITICS),
            "toneDigits": inv.TONE_DIGITS,
            "unknown": inv.UNKNOWN,
        },
    }


def write_all() -> dict[str, int]:
    """Write every file; returns name → size in bytes."""
    OUT.mkdir(parents=True, exist_ok=True)
    sizes: dict[str, int] = {}
    for name, value in build().items():
        write(name, value)
        sizes[name] = (OUT / name).stat().st_size
    return sizes
