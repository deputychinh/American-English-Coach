"""Paired devices (phones) allowed to call the API from the network."""

import secrets
from datetime import datetime

from sqlalchemy import select

from app.db.engine import SessionFactory
from app.db.models import Device, utcnow


class DeviceRepository:
    """SQLAlchemy implementation."""

    def __init__(self, sessions: SessionFactory) -> None:
        self._sessions = sessions

    def create(self, name: str) -> str:
        """Register a device and return its new token."""
        token = secrets.token_urlsafe(32)
        with self._sessions.session() as session:
            session.add(Device(token=token, name=name[:80]))
        return token

    def is_valid(self, token: str) -> bool:
        """True for a known token; updates `last_seen_at`."""
        with self._sessions.session() as session:
            device = session.get(Device, token)
            if device is None:
                return False
            device.last_seen_at = utcnow()
            return True

    def list(self) -> list[tuple[str, datetime, datetime | None]]:
        """(name, created, last seen) for every paired device."""
        with self._sessions.session() as session:
            rows = session.scalars(select(Device).order_by(Device.created_at)).all()
            return [(d.name, d.created_at, d.last_seen_at) for d in rows]
