"""Write `web/src/data/content/` for the offline app (see app/eval/content_snapshot.py)."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.eval.content_snapshot import write_all

if __name__ == "__main__":
    for name, size in write_all().items():
        print(name, size, "bytes")
