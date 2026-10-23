"""Draft or refresh `content/vocab.json` (see app/eval/vocab_draft.py)."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.eval.vocab_draft import write

if __name__ == "__main__":
    print(write(), "items")
