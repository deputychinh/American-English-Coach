"""Versioned starter curriculum authored for this application."""
import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def load_content():
    result = {"version": 1, "source": "Nội dung khởi đầu tự biên soạn · phiên âm Mỹ rộng"}
    for kind in ("words", "sentences"):
        with (ROOT / "content" / (kind + ".tsv")).open(encoding="utf-8") as source:
            rows = list(csv.DictReader(source, delimiter="\t"))
        for index, row in enumerate(rows, 1):
            row["id"] = ("w" if kind == "words" else "s") + str(index).zfill(3)
            row["unit"] = int(row["unit"])
        result[kind] = rows
    result["units"] = json.loads((ROOT / "content/units.json").read_text(encoding="utf-8"))
    return result
