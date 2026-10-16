"""Store the learner's mouth-feature calibration."""

import json

from app.db.engine import SessionFactory
from app.db.models import Calibration

DEFAULT_ID = "default"


class CalibrationRepository:
    """Single-learner storage keyed by a fixed id."""

    def __init__(self, sessions: SessionFactory) -> None:
        self._sessions = sessions

    def save(self, data: dict[str, dict[str, float]]) -> None:
        """Insert or replace the calibration."""
        with self._sessions.session() as session:
            row = session.get(Calibration, DEFAULT_ID)
            if row is None:
                session.add(Calibration(id=DEFAULT_ID, data_json=json.dumps(data)))
            else:
                row.data_json = json.dumps(data)

    def get(self) -> dict[str, dict[str, float]] | None:
        """The stored calibration, or `None` before the first calibration."""
        with self._sessions.session() as session:
            row = session.get(Calibration, DEFAULT_ID)
            if row is None:
                return None
            data: dict[str, dict[str, float]] = json.loads(row.data_json)
            return data
