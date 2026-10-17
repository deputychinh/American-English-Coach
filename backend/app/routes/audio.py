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
    """WAV of the prompt: a licensed human clip when available, else the local voice (cached)."""
    path = container.audio.reference(text)
    source = "human" if container.audio.is_human(text) else "tts"
    return FileResponse(
        path,
        media_type="audio/wav",
        headers={"Cache-Control": "max-age=86400", "X-Coach-Voice": source},
    )
