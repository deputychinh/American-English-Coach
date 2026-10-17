"""ORM models. Learner data stays in one local SQLite file (`data/coach.sqlite3`)."""

from datetime import UTC, datetime

from sqlalchemy import Boolean, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


def utcnow() -> datetime:
    """Timezone-aware UTC now (stored as ISO-8601 text by SQLite)."""
    return datetime.now(UTC)


class Base(DeclarativeBase):
    """Declarative base shared by all tables."""


DEFAULT_PROFILE_ID = "default"


class Profile(Base):
    """A learner on this coach; results and calibration are kept per profile."""

    __tablename__ = "profiles"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    name: Mapped[str] = mapped_column(String(80))
    created_at: Mapped[datetime] = mapped_column(default=utcnow)


class AssessmentRun(Base):
    """One recorded attempt and its full JSON result."""

    __tablename__ = "assessment_runs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    # Plain indexed column (no DB-level FK): SQLite cannot add constraints to an existing table
    # without rebuilding it; the profile service deletes runs with their profile.
    profile_id: Mapped[str] = mapped_column(String(32), index=True, default=DEFAULT_PROFILE_ID)
    item_id: Mapped[str] = mapped_column(String(64), index=True)
    text: Mapped[str] = mapped_column(Text)
    model_version: Mapped[str] = mapped_column(String(128))
    created_at: Mapped[datetime] = mapped_column(default=utcnow)
    ok_count: Mapped[int] = mapped_column(Integer, default=0)
    check_count: Mapped[int] = mapped_column(Integer, default=0)
    error_count: Mapped[int] = mapped_column(Integer, default=0)
    result_json: Mapped[str] = mapped_column(Text)
    disputed: Mapped[bool] = mapped_column(Boolean, default=False)

    phonemes: Mapped[list["PhonemeResult"]] = relationship(
        back_populates="run", cascade="all, delete-orphan"
    )


class PhonemeResult(Base):
    """Per-phone verdict, kept in rows so progress can be aggregated per sound."""

    __tablename__ = "phoneme_results"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    run_id: Mapped[str] = mapped_column(ForeignKey("assessment_runs.id"), index=True)
    word: Mapped[str] = mapped_column(String(64))
    phoneme: Mapped[str] = mapped_column(String(4), index=True)
    verdict: Mapped[str] = mapped_column(String(8))
    gop: Mapped[float] = mapped_column(Float)
    visual: Mapped[str] = mapped_column(String(16))
    error_id: Mapped[str | None] = mapped_column(String(64), nullable=True)

    run: Mapped[AssessmentRun] = relationship(back_populates="phonemes")


class Calibration(Base):
    """Personal mouth-feature calibration (min/max per feature); the row id is the profile id."""

    __tablename__ = "calibrations"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    data_json: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(default=utcnow)


class Device(Base):
    """A phone paired with this coach; the token travels in `X-Coach-Token`."""

    __tablename__ = "devices"

    token: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(80))
    created_at: Mapped[datetime] = mapped_column(default=utcnow)
    last_seen_at: Mapped[datetime | None] = mapped_column(nullable=True)
