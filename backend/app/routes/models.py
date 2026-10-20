"""On-device model files for the iPhone app, served by a learner's own scoring server.

Development and classroom use: a phone downloads the ONNX model from the Mac it is paired with.
The App Store build downloads the same files (same manifest and SHA-256) from a CDN.
"""

import json
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends
from fastapi.responses import FileResponse

from app.container import AppContainer
from app.dependencies import get_container
from app.errors import NotFoundError

router = APIRouter(tags=["models"])


def onnx_dir(container: AppContainer) -> Path:
    """`data/models/onnx`, written by `scripts/export_onnx.py`."""
    return container.settings.resolved_model_dir.parent / "onnx"


def read_manifest(container: AppContainer) -> dict[str, Any]:
    """The export manifest; 404 when the model was never exported on this machine."""
    path = onnx_dir(container) / "manifest.json"
    if not path.exists():
        raise NotFoundError("no on-device model exported; run scripts/export_onnx.py")
    manifest: dict[str, Any] = json.loads(path.read_text(encoding="utf-8"))
    return manifest


@router.get("/models/manifest")
def manifest(container: AppContainer = Depends(get_container)) -> dict[str, Any]:
    """File names, sizes and SHA-256 of the on-device model."""
    return read_manifest(container)


@router.get("/models/{name}", response_class=FileResponse)
def model_file(name: str, container: AppContainer = Depends(get_container)) -> FileResponse:
    """One file listed in the manifest (any other name is 404, so no path tricks)."""
    files: dict[str, Any] = read_manifest(container).get("files", {})
    if name not in files:
        raise NotFoundError(f"model file {name} not found")
    return FileResponse(onnx_dir(container) / name, media_type="application/octet-stream")
