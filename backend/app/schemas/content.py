"""Lesson content models."""

from pydantic import BaseModel, Field

from app.enums import VisemeGroup


class PhonemeCard(BaseModel):
    """One entry of the 44-sound chart with Vietnamese articulation tips."""

    id: str
    symbol: str
    us: str
    group: str
    example: str
    contrast: str
    arpabet: str
    tip: str
    note: str
    viseme_group: VisemeGroup | None
    viseme_confidence: str | None


class MinimalPair(BaseModel):
    """Two words that differ in the focus sound."""

    id: str
    focus: str
    words: list[str]
    error_id: str
    title_vi: str


class Sentence(BaseModel):
    """A practice sentence with its intonation kind."""

    id: str
    text: str
    focus: list[str]
    kind: str
    title_vi: str


class KnownErrorCard(BaseModel):
    """Catalogue entry exposed to the UI."""

    id: str
    expected: str
    heard: list[str]
    kind: str
    priority: int
    final_only: bool
    viseme_group: VisemeGroup | None
    hint_vi: str
    mouth_tip_vi: str
    enabled: bool


class VisemeTargetCard(BaseModel):
    """Target ranges and copy for the mouth mirror."""

    group: VisemeGroup
    name_vi: str
    sounds: list[str]
    targets: dict[str, dict[str, float]]
    hold_ms: int
    hint_vi: str
    common_error_vi: str
    confidence: str


class CalibrationStep(BaseModel):
    """One step of the 20-second calibration flow."""

    id: str
    prompt_vi: str
    seconds: int


class VisemeContent(BaseModel):
    """Everything the mirror needs at start-up."""

    features: list[str]
    groups: list[VisemeTargetCard]
    calibration: list[CalibrationStep]
    transitions: dict[str, str]
    confidence_labels: dict[str, str]


class DrillWord(BaseModel):
    """A practice word with where the target sound sits."""

    word: str
    position: str


class DrillSentence(BaseModel):
    """A practice sentence with its intonation kind."""

    text: str
    kind: str


class SoundDrill(BaseModel):
    """Validated practice material for one chart sound."""

    id: str
    symbol: str
    us: str
    arpabet: str
    group: str
    viseme_group: VisemeGroup | None
    viseme_confidence: str | None
    scorer_reliability: str = Field(
        default="unknown",
        description="How far the sound scorer can be trusted on this sound: high, medium, low "
        "(native-voice false alarms, content/scorer_reliability.json) or unknown.",
    )
    transition_vi: str | None
    words: list[DrillWord]
    pairs: list[list[str]]
    sentences: list[DrillSentence]


class SoundDrillSummary(BaseModel):
    """Row of the "practise by sound" list."""

    id: str
    symbol: str
    us: str
    arpabet: str
    group: str
    viseme_group: VisemeGroup | None
    viseme_confidence: str | None
    scorer_reliability: str = Field(
        default="unknown",
        description="How far the sound scorer can be trusted on this sound: high, medium, low "
        "(native-voice false alarms, content/scorer_reliability.json) or unknown.",
    )
    word_count: int
    pair_count: int
    sentence_count: int
    example: str = Field(description="First drill word, shown under the symbol like the chart.")
