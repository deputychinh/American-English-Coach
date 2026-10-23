"""Draft the vocabulary deck (`content/vocab.json`) from the units' role-plays (plan v2, V2b).

Each unit's target words become `word` items (several words such as "turn it on" become
`chunk` items); short role-play lines become `chunk` items. Examples come from the same
role-play, so every item is met in context and the model voice already exists for it.

A rerun adds new items and refreshes derived fields (IPA, units, level) but keeps what people
edited: meaning, part of speech, example and review status. New word items start as `draft`
with an empty meaning; a reviewer writes the meaning and sets `approved`. Role-play lines reuse
the curriculum's translation, so they start as `approved`.

Run: `uv run python scripts/build_vocab_draft.py`.
"""

import json
import re
from pathlib import Path
from typing import Any

from app.domain.pronouncing import PronouncingDictionary

ROOT = Path(__file__).resolve().parents[3]
CONTENT = ROOT / "content"
OUT = CONTENT / "vocab.json"
SCHEMA = "aec-vocab/1"
MAX_CHUNK_WORDS = 6
DERIVED = ("kind", "text", "ipa", "units", "level")
PRIMARY_STRESS = "\u02c8"


def slug(text: str) -> str:
    """Stable id part: lower-case words joined by hyphens."""
    return "-".join(re.findall(r"[a-z0-9]+", text.lower().replace("'", "")))


def ipa_of(dictionary: PronouncingDictionary, text: str) -> str:
    """Broad IPA of the dictionary's first variant, with a primary-stress mark per word."""
    words: list[str] = []
    for entry in dictionary.for_text(text):
        phones = list(entry.primary)
        vowels = [i for i, p in enumerate(phones) if p.is_vowel]
        symbols = [p.ipa for p in phones]
        stressed = next((i for i in vowels if phones[i].stress == 1), None)
        if len(vowels) > 1 and stressed is not None:
            onset = stressed
            # One consonant joins the stressed syllable; a word-initial cluster joins it whole.
            if onset > 0 and not phones[onset - 1].is_vowel:
                onset -= 1
            if all(not p.is_vowel for p in phones[:onset]):
                onset = 0
            symbols.insert(onset, PRIMARY_STRESS)
        words.append("".join(symbols))
    return " ".join(words)


def _mentions(text: str, target: str) -> bool:
    return re.search(rf"(?<![a-z']){re.escape(target.lower())}(?![a-z'])", text.lower()) is not None


def _dialogue(unit: dict[str, Any]) -> list[dict[str, str]]:
    step = next(s for s in unit["steps"] if s["kind"] == "communicate")
    return list(step.get("dialogue", []))


def _targets(unit: dict[str, Any]) -> list[str]:
    step = next(s for s in unit["steps"] if s["kind"] == "communicate")
    return list(step.get("target_words", []))


def _target_item(target: str, lines: list[dict[str, str]], ipa: str) -> dict[str, Any]:
    """A unit's target word (or multi-word chunk), shown with its first role-play line."""
    line = next((t for t in lines if _mentions(t["text"], target)), None)
    kind = "chunk" if " " in target else "word"
    return {
        "id": f"{kind[0]}.{slug(target)}",
        "kind": kind,
        "text": target,
        "ipa": ipa,
        "pos": "",
        "meaning_vi": "",
        "example": {"en": line["text"], "vi": line["vi"]} if line else None,
        "source": {"list": "curriculum", "meaning": "authored", "ipa": "cmudict"},
        "review": "draft",
    }


def _line_item(line: dict[str, str], ipa: str) -> dict[str, Any]:
    """A short role-play line as a chunk; the curriculum's translation is its meaning."""
    return {
        "id": f"c.{slug(line['text'])}",
        "kind": "chunk",
        "text": line["text"],
        "ipa": ipa,
        "pos": "phrase",
        "meaning_vi": line["vi"],
        "example": {"en": line["text"], "vi": line["vi"]},
        "source": {"list": "curriculum", "meaning": "curriculum", "ipa": "cmudict"},
        "review": "approved",
    }


def derive(curriculum: dict[str, Any], dictionary: PronouncingDictionary) -> list[dict[str, Any]]:
    """Items as the curriculum implies them, before any human edit."""
    items: dict[str, dict[str, Any]] = {}
    for level, unit in (
        (index, unit)
        for index, entry in enumerate(curriculum["levels"], start=1)
        for unit in entry["units"]
    ):
        lines = _dialogue(unit)
        found = [_target_item(t, lines, ipa_of(dictionary, t)) for t in _targets(unit)]
        found += [
            _line_item(line, ipa_of(dictionary, line["text"]))
            for line in lines
            if len(line["text"].split()) <= MAX_CHUNK_WORDS
        ]
        for item in found:
            known = items.setdefault(item["id"], {**item, "units": [], "level": level})
            if unit["id"] not in known["units"]:
                known["units"].append(unit["id"])
    return list(items.values())


def merge(derived: list[dict[str, Any]], existing: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Derived items with every human-edited field of the existing file kept."""
    edited = {item["id"]: item for item in existing}
    merged: list[dict[str, Any]] = []
    for item in derived:
        kept = edited.get(item["id"])
        if kept is None:
            merged.append(item)
            continue
        merged.append({**kept, **{key: item[key] for key in DERIVED}})
    return merged


def build() -> dict[str, Any]:
    """The deck file as it should be committed."""
    curriculum = json.loads((CONTENT / "curriculum.json").read_text(encoding="utf-8"))
    dictionary = PronouncingDictionary.load(ROOT / "vendor" / "cmudict.dict")
    existing = json.loads(OUT.read_text(encoding="utf-8"))["items"] if OUT.exists() else []
    return {"schema": SCHEMA, "items": merge(derive(curriculum, dictionary), existing)}


def write() -> int:
    """Write `content/vocab.json`; returns the number of items."""
    deck = build()
    OUT.write_text(json.dumps(deck, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return len(deck["items"])
