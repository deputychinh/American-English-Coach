"""Write `backend/openapi.json` (source for the web client's generated types)."""

import json
from pathlib import Path

from app.config import Settings
from app.main import create_app

TARGET = Path(__file__).resolve().parents[1] / "openapi.json"


def main() -> None:
    """Export the schema deterministically (sorted keys)."""
    schema = create_app(Settings(web_dist_dir=None)).openapi()
    TARGET.write_text(json.dumps(schema, indent=2, sort_keys=True) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
