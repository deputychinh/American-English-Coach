"""Optional LLM tutor endpoints (enabled only with a configured provider and key)."""

import time

from fastapi import APIRouter, Depends, File, Form, Request, UploadFile
from pydantic import BaseModel

from app.container import AppContainer
from app.dependencies import get_container
from app.errors import DomainError, RateLimitedError

router = APIRouter(prefix="/tutor", tags=["tutor"])
MAX_IMAGE_BYTES = 2 * 1024 * 1024


class ExplainRequest(BaseModel):
    """Which stored run to explain."""

    run_id: str


class TutorReply(BaseModel):
    """The tutor's Vietnamese text and the model that wrote it."""

    text_vi: str
    model: str


def _throttle(request: Request, container: AppContainer) -> None:
    key = request.headers.get("X-Coach-Token") or (request.client.host if request.client else "?")
    if not container.tutor_limiter.allow(key, time.monotonic()):
        raise RateLimitedError("tutor limit reached: try again in a minute")


@router.post("/explain", response_model=TutorReply)
def explain(
    body: ExplainRequest,
    request: Request,
    container: AppContainer = Depends(get_container),
) -> TutorReply:
    """Explain a run's verdicts in plain Vietnamese (the model does not score)."""
    _throttle(request, container)
    text = container.tutor.explain(body.run_id)
    return TutorReply(text_vi=text, model=container.settings.llm_model)


@router.post("/mouth", response_model=TutorReply)
async def mouth(
    *,
    request: Request,
    container: AppContainer = Depends(get_container),
    image: UploadFile = File(...),
    sound_ipa: str = Form(..., min_length=1, max_length=8),
    target_vi: str = Form(..., min_length=1, max_length=300),
) -> TutorReply:
    """Comment on one JPEG of the learner's mouth (sent only when the learner asks)."""
    _throttle(request, container)
    payload = await image.read()
    if len(payload) > MAX_IMAGE_BYTES or payload[:3] != b"\xff\xd8\xff":
        raise DomainError("image must be a JPEG under 2 MB")
    text = container.tutor.mouth(payload, sound_ipa, target_vi)
    return TutorReply(text_vi=text, model=container.settings.llm_vision_model)
