"""Learner profiles."""

import secrets
from dataclasses import dataclass
from datetime import datetime

from sqlalchemy import delete, func, select

from app.db.engine import SessionFactory
from app.db.models import (
    DEFAULT_PROFILE_ID,
    AssessmentRun,
    Calibration,
    PhonemeResult,
    Profile,
)
from app.errors import NotFoundError
from app.repositories.results_repository import aware_utc

PROFILE_ID_BYTES = 4


@dataclass(frozen=True, slots=True)
class ProfileRow:
    """A profile with how many runs it holds."""

    id: str
    name: str
    created_at: datetime
    runs: int


class ProfileRepository:
    """SQLAlchemy implementation; the `default` profile always exists (migration 0003)."""

    def __init__(self, sessions: SessionFactory) -> None:
        self._sessions = sessions

    def list(self) -> list[ProfileRow]:
        """Every profile, oldest first, with its run count."""
        with self._sessions.session() as session:
            counts = dict(
                session.execute(
                    select(AssessmentRun.profile_id, func.count()).group_by(
                        AssessmentRun.profile_id
                    )
                ).all()
            )
            rows = session.scalars(select(Profile).order_by(Profile.created_at, Profile.id)).all()
            return [
                ProfileRow(p.id, p.name, aware_utc(p.created_at), int(counts.get(p.id, 0)))
                for p in rows
            ]

    def get(self, profile_id: str) -> ProfileRow:
        """One profile or `NotFoundError`."""
        with self._sessions.session() as session:
            row = session.get(Profile, profile_id)
            if row is None:
                raise NotFoundError(f"profile {profile_id} not found")
            runs = session.scalar(
                select(func.count()).where(AssessmentRun.profile_id == profile_id)
            )
            return ProfileRow(row.id, row.name, aware_utc(row.created_at), int(runs or 0))

    def exists(self, profile_id: str) -> bool:
        """Cheap existence check used by the request dependency."""
        with self._sessions.session() as session:
            return session.get(Profile, profile_id) is not None

    def create(self, name: str) -> ProfileRow:
        """New profile with a short random id."""
        profile_id = secrets.token_hex(PROFILE_ID_BYTES)
        with self._sessions.session() as session:
            row = Profile(id=profile_id, name=name.strip()[:80])
            session.add(row)
            session.flush()
            return ProfileRow(row.id, row.name, aware_utc(row.created_at), 0)

    def rename(self, profile_id: str, name: str) -> ProfileRow:
        """Change the display name."""
        with self._sessions.session() as session:
            row = session.get(Profile, profile_id)
            if row is None:
                raise NotFoundError(f"profile {profile_id} not found")
            row.name = name.strip()[:80]
        return self.get(profile_id)

    def delete(self, profile_id: str) -> None:
        """Remove the profile with every run, phoneme row and its calibration."""
        with self._sessions.session() as session:
            row = session.get(Profile, profile_id)
            if row is None:
                raise NotFoundError(f"profile {profile_id} not found")
            run_ids = select(AssessmentRun.id).where(AssessmentRun.profile_id == profile_id)
            session.execute(delete(PhonemeResult).where(PhonemeResult.run_id.in_(run_ids)))
            session.execute(delete(AssessmentRun).where(AssessmentRun.profile_id == profile_id))
            session.execute(delete(Calibration).where(Calibration.id == profile_id))
            session.delete(row)


def is_default(profile_id: str) -> bool:
    """The implicit profile every pre-profile result belongs to."""
    return profile_id == DEFAULT_PROFILE_ID
