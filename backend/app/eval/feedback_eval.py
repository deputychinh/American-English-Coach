"""How well content feedback finds real errors (plan v2 V6 acceptance).

Each sentence in `resources/feedback_eval.json` has one labelled error, or none. A reported
issue counts as right when it points at the labelled words (the corrected wording may differ:
there are several good ways to fix a sentence). Precision is measured on what the learner would
see, after the pronunciation filter; pronunciation remarks are also counted in the model's raw
replies, so a prompt that drifts shows up even though the filter hides it.
"""

import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from app.schemas.feedback import FeedbackIssue
from app.services.feedback_service import build_feedback, is_about_pronunciation

EVAL_PATH = Path(__file__).resolve().parents[1] / "resources" / "feedback_eval.json"
PRECISION_TARGET = 0.8


@dataclass(frozen=True)
class LabelledError:
    """The one error a sentence was written with."""

    kind: str
    wrong: str
    right: str


@dataclass(frozen=True)
class EvalItem:
    """A learner-style sentence and its labelled errors (none for a clean one)."""

    id: str
    text: str
    errors: tuple[LabelledError, ...]


@dataclass(frozen=True)
class EvalReport:
    """Counts and rates over the evaluation set; `passed` is the plan's precision gate."""

    items: int
    reported: int
    correct: int
    labelled: int
    found: int
    false_alarms: int
    pronunciation_remarks: int
    precision: float
    recall: float
    passed: bool


def load_items(path: Path = EVAL_PATH) -> list[EvalItem]:
    """The labelled sentences."""
    raw = json.loads(path.read_text(encoding="utf-8"))
    return [
        EvalItem(
            id=item["id"],
            text=item["text"],
            errors=tuple(LabelledError(**error) for error in item["errors"]),
        )
        for item in raw["items"]
    ]


def _words(text: str) -> set[str]:
    return set(re.findall(r"[a-z']+", text.lower().replace("\u2019", "'")))


def points_at(issue: FeedbackIssue, error: LabelledError) -> bool:
    """The issue names (some of) the labelled wrong words."""
    return bool(_words(issue.wrong) & _words(error.wrong))


def _raw_pronunciation_remarks(reply: dict[str, Any]) -> int:
    remarks = 0
    for key in ("grammar", "word_choice"):
        for item in reply.get(key) or []:
            if isinstance(item, dict) and is_about_pronunciation(str(item.get("explain_vi", ""))):
                remarks += 1
    note = reply.get("register_note_vi")
    return remarks + (1 if isinstance(note, str) and is_about_pronunciation(note) else 0)


def score(items: list[EvalItem], replies: dict[str, dict[str, Any]]) -> EvalReport:
    """Precision and recall of the delivered feedback over the labelled sentences."""
    reported = correct = found = false_alarms = remarks = 0
    for item in items:
        reply = replies.get(item.id, {})
        remarks += _raw_pronunciation_remarks(reply)
        feedback = build_feedback(reply, "eval")
        issues = feedback.grammar + feedback.word_choice
        reported += len(issues)
        if not item.errors:
            false_alarms += len(issues)
        correct += sum(any(points_at(i, e) for e in item.errors) for i in issues)
        found += sum(any(points_at(i, e) for i in issues) for e in item.errors)
    labelled = sum(len(item.errors) for item in items)
    precision = correct / reported if reported else 0.0
    return EvalReport(
        items=len(items),
        reported=reported,
        correct=correct,
        labelled=labelled,
        found=found,
        false_alarms=false_alarms,
        pronunciation_remarks=remarks,
        precision=round(precision, 3),
        recall=round(found / labelled, 3) if labelled else 0.0,
        passed=precision >= PRECISION_TARGET,
    )
