"""Application settings (the only place that reads the environment)."""

from app.config.settings import Settings, get_settings

__all__ = ["Settings", "get_settings"]
