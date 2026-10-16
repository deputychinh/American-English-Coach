"""Settings read from `COACH_*` environment variables, validated at start-up."""

from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

from app.constants import DEFAULT_MODEL_ID, DEFAULT_VOICE

REPO_ROOT = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    """Runtime configuration; defaults suit a single learner on one machine."""

    model_config = SettingsConfigDict(env_prefix="COACH_", extra="ignore")

    host: str = "127.0.0.1"
    port: int = 8765
    data_dir: Path = REPO_ROOT / "data"
    content_dir: Path = REPO_ROOT / "content"
    vendor_dir: Path = REPO_ROOT / "vendor"
    web_dist_dir: Path | None = None
    model_id: str = DEFAULT_MODEL_ID
    model_dir: Path | None = None
    device: str = Field(default="auto", pattern="^(auto|cpu|mps|cuda)$")
    realtime_enabled: bool = True
    tts_voice: str = DEFAULT_VOICE
    cors_origins: list[str] = ["http://127.0.0.1:3200", "http://localhost:3200"]
    log_level: str = "INFO"

    @property
    def database_path(self) -> Path:
        """SQLite file holding learner results and calibration."""
        return self.data_dir / "coach.sqlite3"

    @property
    def lexicon_path(self) -> Path:
        """SQLite index built from the bundled dictionaries."""
        return self.data_dir / "lexicon.sqlite3"

    @property
    def audio_dir(self) -> Path:
        """Cache of synthesised reference audio."""
        return self.data_dir / "audio"

    @property
    def resolved_model_dir(self) -> Path:
        """Local directory of the phoneme model (download target and load source)."""
        return self.model_dir or self.data_dir / "models" / self.model_id.split("/")[-1]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Settings singleton; cleared by tests that override the environment."""
    return Settings()
