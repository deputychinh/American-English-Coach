"""Every text the app plays as a model voice, gathered from the content files.

Words of the 44-sound chart (example and contrast), drill words, pairs and sentences, minimal
pairs, practice sentences, and the listening material of the curriculum (pairs, stress words,
focus sentences). The voice builder renders exactly this list; a test keeps it in step with the
content.
"""

import json
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[3]
CONTENT = ROOT / "content"


def _json(name: str) -> Any:  # noqa: ANN401 - content files are plain JSON
    return json.loads((CONTENT / name).read_text(encoding="utf-8"))


def reference_texts() -> list[str]:
    """Sorted, de-duplicated texts (exactly as the app passes them to the player)."""
    texts: set[str] = set()
    sentences = {s["id"]: s["text"] for s in _json("sentences.json")}
    pairs = {p["id"]: p["words"] for p in _json("minimal_pairs.json")}
    texts.update(sentences.values())
    texts.update(word for words in pairs.values() for word in words)
    for drill in _json("sound_drills.json"):
        texts.update(w["word"] for w in drill["words"])
        texts.update(word for pair in drill["pairs"] for word in pair)
        texts.update(s["text"] for s in drill["sentences"])
    import csv  # noqa: PLC0415 - only needed here

    with (CONTENT / "phonemes.tsv").open(encoding="utf-8") as source:
        for row in csv.DictReader(source, delimiter="\t"):
            texts.update(t for t in (row["example"], row["contrast"]) if t)
    for level in _json("curriculum.json")["levels"]:
        for unit in level["units"]:
            for step in unit["steps"]:
                if step["kind"] != "discriminate":
                    continue
                texts.update(word for pair_id in step["pairs"] for word in pairs[pair_id])
                texts.update(item["word"] for item in step["stress"])
                texts.update(sentences[item["sentence"]] for item in step["focus"])
    return sorted(t.strip() for t in texts if t.strip())
