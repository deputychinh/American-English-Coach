"""Settings read from `COACH_*` environment variables, validated at start-up."""

from functools import lru_cache
from pathlib import Path

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

from app.constants import DEFAULT_MODEL_ID, DEFAULT_VOICE

REPO_ROOT = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    """Runtime configuration; defaults suit a single learner on one machine."""

    model_config = SettingsConfigDict(
        env_prefix="COACH_", env_file=REPO_ROOT / ".env", extra="ignore"
    )

    host: str = "127.0.0.1"
    port: int = 8765
    data_dir: Path = REPO_ROOT / "data"
    content_dir: Path = REPO_ROOT / "content"
    vendor_dir: Path = REPO_ROOT / "vendor"
    web_dist_dir: Path | None = None
    model_id: str = DEFAULT_MODEL_ID
    model_dir: Path | None = None
    device: str = Field(default="auto", pattern="^(auto|cpu|mps|cuda)$")
    # `fake` runs the API without the model (CI, demos); results are tagged fake-recognizer@ci.
    recognizer: str = Field(default="wav2vec2", pattern="^(wav2vec2|fake|onnx)$")
    # `onnx` runs the exported model the iPhone app uses (data/models/onnx/<file>), for evaluation.
    onnx_model: str = "w2v.mm8.onnx"
    # Load the phoneme model in the background at start so the first scoring is not a cold load.
    warm_up: bool = True
    log_json: bool = True
    # Fixed pairing code (6 digits) for phones; empty = a new code each start, printed in the log.
    pairing_code: str = Field(default="", pattern=r"^(\d{6})?$")
    # False makes the Mac itself pair like a phone: e2e runs this way so token bugs show up.
    trust_loopback: bool = True
    tutor_rate_limit_per_minute: int = 10
    realtime_enabled: bool = True
    tts_voice: str = DEFAULT_VOICE
    cors_origins: list[str] = [
        "http://127.0.0.1:3200",
        "http://localhost:3200",
        # Capacitor (iOS app) serves the web app from these origins.
        "capacitor://localhost",
        "ionic://localhost",
        "http://localhost",
    ]
    # Phones on the LAN reach the API by the Mac's private address (make api-lan).
    cors_origin_regex: str = r"^https?://(192\.168|10|172\.(1[6-9]|2\d|3[01]))\.\d+\.\d+(:\d+)?$"
    log_level: str = "INFO"
    # Optional LLM tutor (explains results; never scores). Off unless a provider and key are set.
    llm_provider: str = Field(default="none", pattern="^(none|kimi|openai)$")
    llm_api_key: SecretStr = SecretStr("")
    llm_base_url: str = "https://api.openai.com/v1"
    # Defaults target OpenAI (GPT-6 Luna reads images too). For Kimi use kimi-k2.7-code-highspeed
    # for text (~2 s) and kimi-k2.6 for photos; see .env.example.
    llm_model: str = "gpt-6-luna"
    llm_vision_model: str = "gpt-6-luna"
    llm_timeout_seconds: float = 120.0
    # Reasoning tokens vary 800-2100 per answer (measured); the answer needs room after them.
    llm_max_tokens: int = 4000

    @property
    def tutor_enabled(self) -> bool:
        """True when a provider and a key are configured."""
        return self.llm_provider != "none" and bool(self.llm_api_key.get_secret_value())

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
