"""Download the phoneme model into `data/models` and record its checksum (run via `make models`)."""

import hashlib
import json
import logging
from pathlib import Path

from huggingface_hub import snapshot_download

from app.config import get_settings

logger = logging.getLogger(__name__)
MANIFEST = Path(__file__).resolve().parents[3] / "docs" / "DATA-MANIFEST.json"


def sha256_of(path: Path) -> str:
    """Hex digest of a file, streamed."""
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> None:
    """Fetch the model and append its files and checksums to the data manifest."""
    settings = get_settings()
    target = settings.resolved_model_dir
    snapshot_download(settings.model_id, local_dir=target)
    weights = next(iter(sorted(target.glob("*.safetensors"))), None) or next(target.glob("*.bin"))
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8")) if MANIFEST.exists() else {}
    manifest.setdefault("models", {})[settings.model_id] = {
        "local_dir": str(target.relative_to(settings.data_dir.parent)),
        "weights": weights.name,
        "sha256": sha256_of(weights),
        "license": "Apache-2.0 (see model card)",
    }
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    logger.info("model ready", extra={"dir": str(target)})


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    main()
