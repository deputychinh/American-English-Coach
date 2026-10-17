"""Store each learner profile's mouth-feature calibration."""

import json

from app.db.engine import SessionFactory
from app.db.models import DEFAULT_PROFILE_ID, Calibration


class CalibrationRepository:
    """One row per profile; the row id is the profile id."""

    def __init__(self, sessions: SessionFactory) -> None:
        self._sessions = sessions

    def save(self, data: dict[str, dict[str, float]], profile_id: str = DEFAULT_PROFILE_ID) -> None:
        """Insert or replace the calibration of a profile."""
        with self._sessions.session() as session:
            row = session.get(Calibration, profile_id)
            if row is None:
                session.add(Calibration(id=profile_id, data_json=json.dumps(data)))
            else:
                row.data_json = json.dumps(data)

    def get(self, profile_id: str = DEFAULT_PROFILE_ID) -> dict[str, dict[str, float]] | None:
        """The stored calibration, or `None` before the first calibration."""
        with self._sessions.session() as session:
            row = session.get(Calibration, profile_id)
            if row is None:
                return None
            data: dict[str, dict[str, float]] = json.loads(row.data_json)
            return data
