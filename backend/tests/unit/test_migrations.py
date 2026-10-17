"""Alembic migrations create the schema and upgrade databases made before Alembic."""

from pathlib import Path

from sqlalchemy import create_engine, inspect, text

from alembic import command
from app.db.engine import create_sqlite_engine
from app.db.migrate import alembic_config


def _legacy_database(path: Path) -> None:
    """A database from the first release: baseline tables with data, no alembic_version."""
    engine = create_engine(f"sqlite:///{path}")
    config = alembic_config(engine)
    with engine.begin() as connection:
        config.attributes["connection"] = connection
        command.upgrade(config, "0001")
    with engine.begin() as connection:
        connection.execute(text("DROP TABLE alembic_version"))
        connection.execute(
            text(
                "INSERT INTO assessment_runs (id, item_id, text, model_version, created_at, "
                "ok_count, check_count, error_count, result_json, disputed) VALUES "
                "('run-old', 'pair:think-sink:0', 'think', 'm', '2026-10-01 10:00:00', "
                "4, 0, 0, '{}', 0)"
            )
        )
        connection.execute(
            text(
                "INSERT INTO calibrations (id, data_json, created_at) "
                "VALUES ('default', '{}', '2026-10-01 10:00:00')"
            )
        )
    engine.dispose()


def test_fresh_database_gets_every_table_a_default_profile_and_a_version_stamp(
    tmp_path: Path,
) -> None:
    engine = create_sqlite_engine(tmp_path / "fresh.sqlite3")
    tables = set(inspect(engine).get_table_names())
    assert {
        "assessment_runs",
        "phoneme_results",
        "calibrations",
        "devices",
        "profiles",
        "alembic_version",
    } <= tables
    with engine.connect() as connection:
        assert connection.execute(text("SELECT id FROM profiles")).scalars().all() == ["default"]


def test_pre_alembic_database_is_stamped_then_upgraded_keeping_its_data(tmp_path: Path) -> None:
    path = tmp_path / "old.sqlite3"
    _legacy_database(path)
    assert "devices" not in inspect(create_engine(f"sqlite:///{path}")).get_table_names()
    engine = create_sqlite_engine(path)
    tables = set(inspect(engine).get_table_names())
    assert {"devices", "profiles", "alembic_version"} <= tables
    with engine.connect() as connection:
        row = connection.execute(
            text("SELECT profile_id, text FROM assessment_runs WHERE id = 'run-old'")
        ).one()
        assert tuple(row) == ("default", "think")
        assert connection.execute(text("SELECT count(*) FROM calibrations")).scalar() == 1
    # Running again is a no-op.
    again = create_sqlite_engine(path)
    assert "profiles" in inspect(again).get_table_names()
