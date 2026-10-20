"""Static API responses bundled into the app so it runs without a server (plan A6).

The snapshot is taken through the real routes (TestClient, fake recogniser, empty database), so
the offline app reads exactly what the API would send. Curriculum and course carry zero
progress; the app recomputes progress from its own stored runs.
"""

import json
import tempfile
from pathlib import Path
from typing import Any

from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / "web" / "src" / "data" / "content"
STATIC = {
    "phonemes.json": "/api/v1/content/phonemes",
    "pairs.json": "/api/v1/content/pairs",
    "sentences.json": "/api/v1/content/sentences",
    "visemes.json": "/api/v1/content/visemes",
    "sounds.json": "/api/v1/content/sounds",
    "curriculum.json": "/api/v1/curriculum",
    "course.json": "/api/v1/course",
}


def build() -> dict[str, Any]:
    """Every bundled response, keyed by file name."""
    with tempfile.TemporaryDirectory() as tmp:
        settings = Settings(
            data_dir=Path(tmp), recognizer="fake", web_dist_dir=None, llm_provider="none"
        )
        with TestClient(create_app(settings)) as client:
            files: dict[str, Any] = {
                name: client.get(path).raise_for_status().json() for name, path in STATIC.items()
            }
            files["sound-drills.json"] = {
                summary["id"]: client.get(f"/api/v1/content/sounds/{summary['id']}")
                .raise_for_status()
                .json()
                for summary in files["sounds.json"]
            }
    return files


def write_all() -> dict[str, int]:
    """Write the snapshot; returns name → size in bytes."""
    OUT.mkdir(parents=True, exist_ok=True)
    sizes: dict[str, int] = {}
    for name, value in build().items():
        path = OUT / name
        path.write_text(
            json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n",
            encoding="utf-8",
        )
        sizes[name] = path.stat().st_size
    return sizes
