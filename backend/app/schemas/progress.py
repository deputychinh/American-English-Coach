"""Progress and history models."""

from datetime import datetime

from pydantic import BaseModel


class RunSummaryModel(BaseModel):
    """History row."""

    id: str
    item_id: str
    text: str
    created_at: datetime
    ok: int
    check: int
    error: int
    model_version: str
    disputed: bool


class PhonemeStatModel(BaseModel):
    """Per-sound totals."""

    phoneme: str
    ipa: str
    total: int
    ok: int
    check: int
    error: int


class ProgressResponse(BaseModel):
    """Dashboard payload; machine-measured only (self-assessment is a separate concept)."""

    runs: int
    phonemes: list[PhonemeStatModel]
    recent: list[RunSummaryModel]


class CalibrationPayload(BaseModel):
    """Min/max per feature captured by the browser."""

    features: dict[str, dict[str, float]]


class HealthResponse(BaseModel):
    """Liveness plus feature availability."""

    status: str
    version: str
    realtime_enabled: bool
    model_ready: bool
    tts_available: bool


class ProblemDetails(BaseModel):
    """RFC 9457 error body."""

    type: str
    title: str
    status: int
    detail: str
    code: str
