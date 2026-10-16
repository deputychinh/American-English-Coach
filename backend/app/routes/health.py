"""Liveness and feature availability."""

import shutil

from fastapi import APIRouter, Depends

from app.container import AppContainer
from app.dependencies import get_container
from app.schemas.progress import HealthResponse

router = APIRouter(tags=["health"])
VERSION = "1.0.0"


@router.get("/health", response_model=HealthResponse)
def health(container: AppContainer = Depends(get_container)) -> HealthResponse:
    """Report whether the model and the local TTS are usable."""
    return HealthResponse(
        status="ok",
        version=VERSION,
        realtime_enabled=container.settings.realtime_enabled,
        model_ready=container.model_ready(),
        tts_available=shutil.which("say") is not None,
        tutor_available=container.settings.tutor_enabled,
        tutor_model=container.settings.llm_model if container.settings.tutor_enabled else None,
    )
