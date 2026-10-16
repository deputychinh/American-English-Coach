"""Typed domain errors; translated to HTTP problem details once, in the API layer."""

from app.enums import ErrorCode


class DomainError(Exception):
    """Base error carrying a stable code; subclasses fix the code per case."""

    code: ErrorCode = ErrorCode.VALIDATION

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


class NotFoundError(DomainError):
    """A requested item (lesson, word, result) does not exist."""

    code = ErrorCode.NOT_FOUND


class AudioInvalidError(DomainError):
    """The uploaded audio could not be decoded or is not speech-length."""

    code = ErrorCode.AUDIO_INVALID


class AudioTooLongError(DomainError):
    """The uploaded audio exceeds the length the assessor accepts."""

    code = ErrorCode.AUDIO_TOO_LONG


class WordUnknownError(DomainError):
    """No reference pronunciation exists for a word in the prompt."""

    code = ErrorCode.WORD_UNKNOWN


class ModelUnavailableError(DomainError):
    """The phoneme model is not downloaded or failed to load."""

    code = ErrorCode.MODEL_UNAVAILABLE


class TtsUnavailableError(DomainError):
    """The local speech synthesiser is missing or failed."""

    code = ErrorCode.TTS_UNAVAILABLE


class TutorUnavailableError(DomainError):
    """The LLM tutor is disabled, misconfigured or the provider failed."""

    code = ErrorCode.TUTOR_UNAVAILABLE


class RateLimitedError(DomainError):
    """Too many requests from one client in the window."""

    code = ErrorCode.RATE_LIMITED


class NotReadyError(DomainError):
    """A dependency the API needs (model, database) is not available yet."""

    code = ErrorCode.NOT_READY


class UnauthorizedError(DomainError):
    """Missing or invalid device token / pairing code."""

    code = ErrorCode.UNAUTHORIZED
