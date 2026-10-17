"""Assessment endpoint (multipart: WAV + prompt + optional mouth features)."""

import json

from fastapi import APIRouter, Depends, File, Form, UploadFile
from pydantic import TypeAdapter, ValidationError

from app.constants import MAX_AUDIO_BYTES
from app.container import AppContainer
from app.dependencies import get_container, get_profile_id
from app.errors import AudioTooLongError, DomainError, ModelUnavailableError
from app.schemas.assessment import AssessmentResponse, MouthFrame
from app.services.assessment_service import AssessmentInput

router = APIRouter(tags=["assessment"])
FRAMES = TypeAdapter(list[MouthFrame])
KINDS = {"word", "statement", "question", "wh_question"}


@router.post("/assess", response_model=AssessmentResponse, status_code=200)
async def assess(
    *,
    container: AppContainer = Depends(get_container),
    profile_id: str = Depends(get_profile_id),
    audio: UploadFile = File(...),
    text: str = Form(..., min_length=1, max_length=200),
    item_id: str = Form(..., min_length=1, max_length=64),
    kind: str = Form("word"),
    mouth_frames: str = Form("[]"),
    audio_started_at: float | None = Form(None),
) -> AssessmentResponse:
    """Score one recording of `text`; mouth frames are optional and never contain video."""
    if not container.settings.realtime_enabled:
        raise ModelUnavailableError("assessment is disabled (COACH_REALTIME_ENABLED=false)")
    if kind not in KINDS:
        raise DomainError(f"kind must be one of {sorted(KINDS)}")
    payload = await audio.read()
    if len(payload) > MAX_AUDIO_BYTES:
        raise AudioTooLongError("audio upload exceeds 8 MB")
    try:
        frames = FRAMES.validate_python(json.loads(mouth_frames))
    except (ValueError, ValidationError) as error:
        raise DomainError("mouth_frames must be a JSON list of {t, features, quality}") from error
    data = AssessmentInput(item_id, text, kind, payload, frames, audio_started_at, profile_id)
    return container.assessment.assess(data)
