"""Structured-enough logging for a local app: one line per event, no personal data."""

import logging


def configure_logging(level: str) -> None:
    """Configure the root logger once."""
    logging.basicConfig(
        level=level.upper(),
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
        force=True,
    )
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
