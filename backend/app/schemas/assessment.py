"""Assessment request pieces and the response shown on the result card."""

from pydantic import BaseModel, Field

from app.enums import ProsodyAspect, Verdict, VisemeGroup, VisualVerdict


class MouthFrame(BaseModel):
    """One camera frame's normalised mouth features with its browser timestamp (seconds)."""

    t: float
    features: dict[str, float]
    quality: float = Field(default=1.0, ge=0.0, le=1.0)


class PhoneResult(BaseModel):
    """Verdict for one expected phone."""

    symbol: str
    ipa: str
    verdict: Verdict
    audio_verdict: Verdict
    visual: VisualVerdict
    viseme_group: VisemeGroup | None
    gop: float
    heard: str
    heard_ipa: str
    start: float
    end: float
    error_id: str | None
    hint_vi: str | None
    mouth_tip_vi: str | None
    show_mouth_hint: bool


class WordResult(BaseModel):
    """A prompt word with its reference IPA and per-phone verdicts."""

    word: str
    ipa: str
    phones: list[PhoneResult]


class ProsodyResult(BaseModel):
    """One prosody finding (never stronger than `check`)."""

    aspect: ProsodyAspect
    verdict: Verdict
    detail_vi: str
    word_index: int | None


class FocusItem(BaseModel):
    """One of at most two priorities to practise next."""

    error_id: str
    phoneme: str
    ipa: str
    hint_vi: str
    count: int


class AssessmentSummary(BaseModel):
    """Counts and the top priorities."""

    ok: int
    check: int
    error: int
    focus: list[FocusItem]
    camera_used: bool


class AssessmentResponse(BaseModel):
    """Everything the result card needs; also stored verbatim for history."""

    id: str
    item_id: str
    text: str
    model_version: str
    words: list[WordResult]
    prosody: list[ProsodyResult]
    summary: AssessmentSummary
