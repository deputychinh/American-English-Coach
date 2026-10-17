"""Learner profiles and their export format."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.enums import Verdict

EXPORT_FORMAT = "aec-profile/1"


class ProfileModel(BaseModel):
    """A learner on this coach."""

    id: str
    name: str
    created_at: datetime
    runs: int


class ProfileCreate(BaseModel):
    """Body for creating or renaming."""

    name: str = Field(min_length=1, max_length=80)


class ExportedPhonemeModel(BaseModel):
    """One per-phone row of a run."""

    word: str
    phoneme: str
    verdict: Verdict
    gop: float
    visual: str
    error_id: str | None


class ExportedRunModel(BaseModel):
    """A full run as stored."""

    id: str = Field(min_length=1, max_length=36)
    item_id: str
    text: str
    model_version: str
    created_at: datetime
    disputed: bool
    result: dict[str, object]
    phonemes: list[ExportedPhonemeModel]


class ProfileExport(BaseModel):
    """Everything a profile owns, portable between coaches."""

    format: Literal["aec-profile/1"]
    exported_at: datetime
    profile: ProfileModel
    calibration: dict[str, dict[str, float]] | None
    runs: list[ExportedRunModel]


class ImportResult(BaseModel):
    """Outcome of importing an export file into a fresh profile."""

    profile: ProfileModel
    imported_runs: int
    skipped_runs: int
