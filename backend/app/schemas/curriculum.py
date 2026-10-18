"""The levelled curriculum (`content/curriculum.json`) and a profile's progress through it."""

from typing import Annotated, Literal

from pydantic import BaseModel, Field

from app.schemas.course import CourseItemRef


class StressItem(BaseModel):
    """A word whose stressed syllable the learner must hear."""

    word: str
    syllables: list[str] = Field(min_length=2)
    stressed: int = Field(ge=0)


class FocusWordItem(BaseModel):
    """A sentence whose focus word the learner must hear."""

    sentence: str
    word: str


class DescribeStep(BaseModel):
    """Step 1: what the sounds look and feel like."""

    kind: Literal["describe"]
    sounds: list[str]
    notes_vi: str


class DiscriminateStep(BaseModel):
    """Step 2: listening, before speaking."""

    kind: Literal["discriminate"]
    pairs: list[str]
    stress: list[StressItem]
    focus: list[FocusWordItem]


class ControlledStep(BaseModel):
    """Step 3: scored repetition of words, pairs and sentences."""

    kind: Literal["controlled"]
    items: list[CourseItemRef] = Field(min_length=1)


class GuidedStep(BaseModel):
    """Step 4: shadowing sentences with the model voice."""

    kind: Literal["guided"]
    sentences: list[str] = Field(min_length=1)


class CommunicateStep(BaseModel):
    """Step 5: use the target in free speech."""

    kind: Literal["communicate"]
    scenario_vi: str
    target_words: list[str] = Field(min_length=1)


Step = Annotated[
    DescribeStep | DiscriminateStep | ControlledStep | GuidedStep | CommunicateStep,
    Field(discriminator="kind"),
]
STEP_ORDER = ("describe", "discriminate", "controlled", "guided", "communicate")


class UnitFile(BaseModel):
    """One unit as authored."""

    id: str
    title_vi: str
    title_en: str
    goal_vi: str
    vn_error_vi: str
    minutes: int = Field(ge=5, le=20)
    days: int = Field(ge=1, le=7)
    focus_sounds: list[str]
    steps: list[Step] = Field(min_length=5, max_length=5)


class LevelFile(BaseModel):
    """One level as authored."""

    id: str
    title_vi: str
    title_en: str
    goal_vi: str
    units: list[UnitFile] = Field(min_length=1)


class CurriculumFile(BaseModel):
    """The whole authored file."""

    schema_: str = Field(alias="schema")
    levels: list[LevelFile] = Field(min_length=1)


class UnitProgressModel(BaseModel):
    """Scored-run progress of the controlled step, as the course counts it."""

    done_items: int
    total_items: int
    is_done: bool
    """`kind:id` of every controlled item with at least one scored run."""
    done_ids: list[str]


class UnitModel(UnitFile):
    """A unit with its place in the sequence and the profile's progress."""

    level: str
    index: int
    progress: UnitProgressModel


class LevelModel(BaseModel):
    """A level with its units and how many are done."""

    id: str
    title_vi: str
    title_en: str
    goal_vi: str
    units: list[UnitModel]
    done_units: int


class CurriculumResponse(BaseModel):
    """All levels plus which unit to do next."""

    levels: list[LevelModel]
    labels: dict[str, str]
    """Display label per `kind:id` (\"sound:c09\" → \"/θ/\") for every referenced item."""
    current_unit: str
    completed_units: int
    total_units: int
