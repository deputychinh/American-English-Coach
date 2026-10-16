"""Run Alembic migrations in-process at start-up (one local SQLite file, one user)."""

from pathlib import Path

from alembic.config import Config
from sqlalchemy import Engine, inspect

from alembic import command

BACKEND_DIR = Path(__file__).resolve().parents[2]
BASELINE_REVISION = "0001"
BASELINE_TABLES = {"assessment_runs", "phoneme_results", "calibrations"}


def alembic_config(engine: Engine) -> Config:
    """Alembic config bound to the given engine's connection (set per call)."""
    config = Config(str(BACKEND_DIR / "alembic.ini"))
    config.set_main_option("script_location", str(BACKEND_DIR / "alembic"))
    config.set_main_option("sqlalchemy.url", str(engine.url))
    return config


def run_migrations(engine: Engine) -> None:
    """Upgrade to head; databases created before Alembic existed are stamped at the baseline."""
    config = alembic_config(engine)
    inspector = inspect(engine)
    tables = set(inspector.get_table_names())
    with engine.begin() as connection:
        config.attributes["connection"] = connection
        if "alembic_version" not in tables and tables >= BASELINE_TABLES:
            command.stamp(config, BASELINE_REVISION)
        command.upgrade(config, "head")
