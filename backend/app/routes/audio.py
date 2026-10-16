"""Reference audio."""

from fastapi import APIRouter, Depends, Query
from fastapi.responses import FileResponse

from app.container import AppContainer
from app.dependencies import get_container

router = APIRouter(tags=["audio"])


@router.get("/audio", response_class=FileResponse)
def audio(
    text: str = Query(..., min_length=1, max_length=200),
    container: AppContainer = Depends(get_container),
) -> FileResponse:
    """WAV of the prompt spoken by the local American voice (cached)."""
    path = container.audio.reference(text)
    return FileResponse(path, media_type="audio/wav", headers={"Cache-Control": "max-age=86400"})
