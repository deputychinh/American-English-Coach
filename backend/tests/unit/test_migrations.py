"""Alembic migrations create the schema and upgrade databases made before Alembic."""

from pathlib import Path

from sqlalchemy import create_engine, inspect

from app.db.engine import create_sqlite_engine
from app.db.models import Base


def test_fresh_database_gets_every_table_and_a_version_stamp(tmp_path: Path) -> None:
    engine = create_sqlite_engine(tmp_path / "fresh.sqlite3")
    tables = set(inspect(engine).get_table_names())
    assert {
        "assessment_runs",
        "phoneme_results",
        "calibrations",
        "devices",
        "alembic_version",
    } <= tables


def test_pre_alembic_database_is_stamped_then_upgraded(tmp_path: Path) -> None:
    path = tmp_path / "old.sqlite3"
    legacy = create_engine(f"sqlite:///{path}")
    # Simulate the first release: baseline tables only, no alembic_version, no devices.
    Base.metadata.create_all(
        legacy,
        tables=[
            Base.metadata.tables[n] for n in ("assessment_runs", "phoneme_results", "calibrations")
        ],
    )
    assert "devices" not in inspect(legacy).get_table_names()
    engine = create_sqlite_engine(path)
    tables = set(inspect(engine).get_table_names())
    assert "devices" in tables
    assert "alembic_version" in tables
    # Running again is a no-op.
    again = create_sqlite_engine(path)
    assert "devices" in inspect(again).get_table_names()
