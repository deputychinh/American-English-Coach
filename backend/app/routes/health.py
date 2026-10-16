"""Liveness and feature availability."""

import shutil

from fastapi import APIRouter, Depends
from sqlalchemy import text

from app.container import AppContainer
from app.dependencies import get_container
from app.errors import NotReadyError
from app.schemas.progress import HealthResponse, ReadyResponse

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


@router.get("/ready", response_model=ReadyResponse)
def ready(container: AppContainer = Depends(get_container)) -> ReadyResponse:
    """Readiness: the database answers and the recogniser can serve (model files present)."""
    with container.sessions.session() as session:
        session.execute(text("SELECT 1"))
    if not container.model_ready():
        raise NotReadyError("phoneme model not downloaded; run `make models`")
    return ReadyResponse(
        status="ready",
        recognizer=container.settings.recognizer,
        model_version=container.recognizer.model_version
        if container.settings.recognizer == "fake"
        else container.settings.model_id,
    )
