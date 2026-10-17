"""Weekly plan payload."""

from datetime import date

from pydantic import BaseModel

from app.enums import FocusReason


class PlanDay(BaseModel):
    """One of the last seven local days."""

    date: date
    runs: int
    ok: int
    check: int
    error: int
    goal_met: bool


class PlanFocus(BaseModel):
    """A sound proposed for today with the reason."""

    phoneme: str
    ipa: str
    reason: FocusReason
    sound_id: str | None
    total: int
    ok_rate: float | None
    days_since: int | None


class PlanResponse(BaseModel):
    """Everything the "Hôm nay" card and the weekly strip need."""

    today: date
    goal_runs: int
    runs_today: int
    streak_days: int
    week: list[PlanDay]
    focus: list[PlanFocus]
    practised_sounds: int
    total_sounds: int
