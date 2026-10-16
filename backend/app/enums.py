"""Enumerations shared across the backend (single source, string values)."""

from enum import StrEnum


class Verdict(StrEnum):
    """Three-level conclusion for one phoneme; never a binary right/wrong."""

    OK = "ok"
    CHECK = "check"
    ERROR = "error"


class AlignmentOp(StrEnum):
    """Edit operation between the expected and the recognised phoneme sequence."""

    MATCH = "match"
    SUBSTITUTION = "substitution"
    DELETION = "deletion"
    INSERTION = "insertion"


class PhonemeClass(StrEnum):
    """Broad articulatory class used to weight substitutions during alignment."""

    VOWEL = "vowel"
    STOP = "stop"
    FRICATIVE = "fricative"
    AFFRICATE = "affricate"
    NASAL = "nasal"
    LIQUID = "liquid"
    GLIDE = "glide"


class VisemeGroup(StrEnum):
    """Visible mouth-shape group (plan §2.1). Sounds outside these are audio-only."""

    LIPS_CLOSED = "V1"
    LIP_TEETH = "V2"
    TONGUE_TEETH = "V3"
    ROUNDED = "V4"
    PROTRUDED = "V5"
    SPREAD = "V6"
    OPEN = "V7"
    SLIGHT_SPREAD = "V8"
    MID_OPEN = "V9"
    SLIGHT_ROUND = "V10"
    TONGUE_TIP = "V11"
    RELAXED = "V12"


class VisualVerdict(StrEnum):
    """Outcome of comparing the learner's mouth features with the target of a sound."""

    OK = "ok"
    OFF = "off"
    UNAVAILABLE = "unavailable"


class ProsodyAspect(StrEnum):
    """Prosody dimensions the analyser reports on."""

    WORD_STRESS = "word_stress"
    FINAL_CONTOUR = "final_contour"
    RHYTHM = "rhythm"


class ErrorCode(StrEnum):
    """Stable machine-readable error codes returned as problem details."""

    VALIDATION = "VALIDATION"
    NOT_FOUND = "NOT_FOUND"
    AUDIO_INVALID = "AUDIO_INVALID"
    AUDIO_TOO_LONG = "AUDIO_TOO_LONG"
    WORD_UNKNOWN = "WORD_UNKNOWN"
    MODEL_UNAVAILABLE = "MODEL_UNAVAILABLE"
    TTS_UNAVAILABLE = "TTS_UNAVAILABLE"
    TUTOR_UNAVAILABLE = "TUTOR_UNAVAILABLE"
