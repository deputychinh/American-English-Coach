"""Composition root: builds every collaborator once from settings (constructor injection)."""

from dataclasses import dataclass
from functools import cached_property
from pathlib import Path

from app.config import Settings
from app.db.engine import SessionFactory, create_sqlite_engine
from app.domain.error_catalog import ErrorCatalog
from app.domain.ports import PhonemeRecognizer
from app.domain.pronouncing import PronouncingDictionary
from app.domain.viseme import VisemeCatalog
from app.errors import TutorUnavailableError
from app.ml.audio import AudioDecoder
from app.ml.features import ProsodyFeatureExtractor
from app.ml.llm_client import ChatClient
from app.ml.tts import SpeechSynthesizer
from app.repositories.calibration_repository import CalibrationRepository
from app.repositories.device_repository import DeviceRepository
from app.repositories.results_repository import ResultsRepository
from app.security import new_pairing_code
from app.services.assessment_service import AssessmentService
from app.services.audio_service import AudioService
from app.services.content_service import ContentService
from app.services.progress_service import ProgressService
from app.services.tutor_service import TutorService

ENABLED_ERRORS_FILE = "enabled_errors.json"


WINDOW_SECONDS = 60.0


class TutorRateLimiter:
    """Fixed-window limiter per client key (token or address); in-memory, single process."""

    def __init__(self, per_minute: int) -> None:
        self._per_minute = per_minute
        self._hits: dict[str, list[float]] = {}

    def allow(self, key: str, now: float) -> bool:
        """Record a hit and tell whether it is within the window."""
        window = [t for t in self._hits.get(key, []) if now - t < WINDOW_SECONDS]
        if len(window) >= self._per_minute:
            self._hits[key] = window
            return False
        window.append(now)
        self._hits[key] = window
        return True


@dataclass
class AppContainer:
    """Lazily-built singletons; tests pass a fake recogniser."""

    settings: Settings
    recognizer_override: PhonemeRecognizer | None = None
    chat_client_override: ChatClient | None = None

    @cached_property
    def sessions(self) -> SessionFactory:
        """Database sessions."""
        return SessionFactory(create_sqlite_engine(self.settings.database_path))

    @cached_property
    def catalog(self) -> ErrorCatalog:
        """Vietnamese error catalogue with the measured enablement list."""
        return ErrorCatalog.load(
            self.settings.content_dir, self.settings.content_dir / ENABLED_ERRORS_FILE
        )

    @cached_property
    def visemes(self) -> VisemeCatalog:
        """Mouth-shape targets."""
        return VisemeCatalog.load(self.settings.content_dir)

    @cached_property
    def dictionary(self) -> PronouncingDictionary:
        """CMUdict."""
        return PronouncingDictionary.load(self.settings.vendor_dir / "cmudict.dict")

    @cached_property
    def recognizer(self) -> PhonemeRecognizer:
        """The phoneme model (imported lazily so the API starts without torch warm-up)."""
        if self.recognizer_override is not None:
            return self.recognizer_override
        if self.settings.recognizer == "fake":
            from app.ml.fake_recognizer import FakeRecognizer  # noqa: PLC0415 - optional mode

            return FakeRecognizer(Path(__file__).resolve().parent / "resources" / "vocab.json")
        from app.ml.recognizer import Wav2Vec2Recognizer  # noqa: PLC0415 - heavy import on demand

        return Wav2Vec2Recognizer(self.settings.resolved_model_dir, self.settings.device)

    @cached_property
    def devices(self) -> DeviceRepository:
        """Paired phones."""
        return DeviceRepository(self.sessions)

    @cached_property
    def pairing_code(self) -> str:
        """Configured code or a fresh one per process start."""
        return self.settings.pairing_code or new_pairing_code()

    @cached_property
    def results(self) -> ResultsRepository:
        """Assessment storage."""
        return ResultsRepository(self.sessions)

    @cached_property
    def calibration(self) -> CalibrationRepository:
        """Calibration storage."""
        return CalibrationRepository(self.sessions)

    @cached_property
    def content(self) -> ContentService:
        """Lesson content."""
        return ContentService(self.settings.content_dir, self.catalog, self.visemes)

    @cached_property
    def audio(self) -> AudioService:
        """Reference audio."""
        return AudioService(SpeechSynthesizer(self.settings.audio_dir, self.settings.tts_voice))

    @cached_property
    def progress(self) -> ProgressService:
        """Progress dashboard."""
        return ProgressService(self.results, self.calibration)

    @cached_property
    def assessment(self) -> AssessmentService:
        """The assessment pipeline."""
        return AssessmentService(
            decoder=AudioDecoder(),
            recognizer=self.recognizer,
            dictionary=self.dictionary,
            catalog=self.catalog,
            visemes=self.visemes,
            features=ProsodyFeatureExtractor(),
            results=self.results,
        )

    @cached_property
    def tutor_limiter(self) -> TutorRateLimiter:
        """Shared limiter for the tutor endpoints."""
        return TutorRateLimiter(self.settings.tutor_rate_limit_per_minute)

    @cached_property
    def tutor(self) -> TutorService:
        """LLM tutor; raises a typed error when no provider is configured."""
        if not self.settings.tutor_enabled and self.chat_client_override is None:
            raise TutorUnavailableError(
                "tutor is off: set COACH_LLM_PROVIDER and COACH_LLM_API_KEY"
            )
        client = self.chat_client_override or ChatClient(
            self.settings.llm_base_url,
            self.settings.llm_api_key.get_secret_value(),
            self.settings.llm_timeout_seconds,
            max_tokens=self.settings.llm_max_tokens,
            provider=self.settings.llm_provider,
        )
        return TutorService(
            client, self.results, self.settings.llm_model, self.settings.llm_vision_model
        )

    def model_ready(self) -> bool:
        """Whether the model files are present (loading happens on first use)."""
        if self.recognizer_override is not None or self.settings.recognizer == "fake":
            return True
        return (self.settings.resolved_model_dir / "vocab.json").exists()
