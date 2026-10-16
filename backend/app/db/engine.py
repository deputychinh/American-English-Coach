"""Engine and session factory for the local SQLite database."""

from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path

from sqlalchemy import Engine, create_engine, event
from sqlalchemy.orm import Session, sessionmaker

from app.db.migrate import run_migrations


def create_sqlite_engine(path: Path) -> Engine:
    """SQLite engine with WAL and foreign keys; applies Alembic migrations on open."""
    path.parent.mkdir(parents=True, exist_ok=True)
    engine = create_engine(f"sqlite:///{path}", future=True)

    @event.listens_for(engine, "connect")
    def _pragmas(connection: object, _record: object) -> None:
        cursor = connection.cursor()  # type: ignore[attr-defined]
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    run_migrations(engine)
    return engine


class SessionFactory:
    """Opens short-lived sessions; one transaction per request."""

    def __init__(self, engine: Engine) -> None:
        self._maker = sessionmaker(engine, expire_on_commit=False)

    @contextmanager
    def session(self) -> Iterator[Session]:
        """Commit on success, roll back on any error."""
        with self._maker() as session:
            try:
                yield session
                session.commit()
            except Exception:
                session.rollback()
                raise
