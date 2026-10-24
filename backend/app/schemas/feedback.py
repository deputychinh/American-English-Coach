"""Content feedback on what the learner said (plan v2 §7, V6)."""

from typing import Literal

from pydantic import BaseModel, Field

IssueKind = Literal["grammar", "word_choice"]
Formality = Literal["casual", "neutral", "formal"]


class FeedbackRequest(BaseModel):
    """The learner's words as text (typed or dictated); audio is never sent."""

    transcript: str = Field(min_length=1, max_length=800)
    task_vi: str | None = Field(default=None, max_length=300)


class FeedbackIssue(BaseModel):
    """One thing to say differently."""

    kind: IssueKind
    wrong: str
    right: str
    explain_vi: str


class ContentFeedback(BaseModel):
    """Grammar and word choice only: the phoneme scorer owns pronunciation."""

    grammar: list[FeedbackIssue]
    word_choice: list[FeedbackIssue]
    #: How formal the words sound (the model's "register"; renamed to keep pydantic's own).
    formality: Formality | None
    formality_note_vi: str | None
    better_version: str | None
    #: The one point to show this turn (plan: at most one content point at a time).
    focus: FeedbackIssue | None
    model: str
