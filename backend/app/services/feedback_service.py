"""AI feedback on the content of what the learner said (plan v2 §7, V6).

The model gets text only, never audio, and returns JSON. It may comment on grammar, word
choice and register; it must not comment on pronunciation, which the phoneme scorer owns. That
rule is enforced here as well as asked for in the prompt: an item whose explanation talks about
sounds, accent, stress or intonation is dropped before it reaches the learner.
"""

import json
import re
from typing import Any

from app.errors import TutorUnavailableError
from app.ml.llm_client import ChatClient
from app.schemas.feedback import ContentFeedback, FeedbackIssue

MAX_ISSUES = 3
REGISTERS = {"casual", "neutral", "formal"}

SYSTEM_FEEDBACK = (
    "You help Vietnamese learners of American English. You receive the TEXT of what a learner "
    "said (from typing or speech recognition) and, sometimes, the task in Vietnamese. Reply with "
    "ONE JSON object and nothing else, with these keys:\n"
    '  "grammar": up to 3 objects {"wrong": exact words from the text, "right": the corrected '
    'words, "explain_vi": one short Vietnamese sentence};\n'
    '  "word_choice": up to 3 objects of the same shape, for words that are understandable but '
    "unnatural or wrong in meaning;\n"
    '  "register": "casual", "neutral" or "formal" (how the text sounds);\n'
    '  "register_note_vi": one short Vietnamese sentence if the register does not fit the task, '
    "else null;\n"
    '  "better_version": the whole text rewritten as natural American English with the same '
    "meaning and level, or null if it is already natural.\n"
    "Rules: only report real errors, most important first; leave lists empty when there are none. "
    "Ignore capitalisation and punctuation, which speech recognition decides. NEVER comment on "
    "pronunciation, sounds, accent, stress, intonation or fluency: a separate scorer handles "
    "those. Do not invent content the learner did not say."
)

#: An explanation about pronunciation, in Vietnamese or English, or quoting IPA between slashes.
PRONUNCIATION = re.compile(
    r"phát âm|ngữ điệu|trọng âm|âm cuối|âm tiết|nuốt âm|giọng|pronunc|accent|intonation"
    r"|/[^/\s]{1,4}/",
    re.IGNORECASE,
)
FENCE = re.compile(r"^```(?:json)?\s*|\s*```$", re.IGNORECASE)


def parse_reply(text: str) -> dict[str, Any]:
    """The JSON object in the model's reply (code fences and stray text around it allowed)."""
    cleaned = FENCE.sub("", text.strip())
    start, end = cleaned.find("{"), cleaned.rfind("}")
    if start < 0 or end <= start:
        raise TutorUnavailableError("the tutor did not answer in JSON")
    try:
        value = json.loads(cleaned[start : end + 1])
    except json.JSONDecodeError as error:
        raise TutorUnavailableError("the tutor answered with broken JSON") from error
    if not isinstance(value, dict):
        raise TutorUnavailableError("the tutor did not answer with a JSON object")
    return value


def _text(value: object) -> str:
    return value.strip() if isinstance(value, str) else ""


def is_about_pronunciation(text: str) -> bool:
    """True when a learner-facing explanation talks about how something sounds."""
    return PRONUNCIATION.search(text) is not None


def clean_issues(raw: object, kind: str) -> list[FeedbackIssue]:
    """Well-formed, real, non-pronunciation issues, at most three."""
    issues: list[FeedbackIssue] = []
    for item in raw if isinstance(raw, list) else []:
        if not isinstance(item, dict):
            continue
        wrong, right, explain = (_text(item.get(key)) for key in ("wrong", "right", "explain_vi"))
        if not wrong or not right or wrong.lower() == right.lower():
            continue
        if is_about_pronunciation(explain):
            continue
        issue = {"kind": kind, "wrong": wrong, "right": right, "explain_vi": explain}
        issues.append(FeedbackIssue.model_validate(issue))
    return issues[:MAX_ISSUES]


def build_feedback(reply: dict[str, Any], model: str) -> ContentFeedback:
    """The learner-facing feedback from the model's JSON, with the rules applied."""
    grammar = clean_issues(reply.get("grammar"), "grammar")
    word_choice = clean_issues(reply.get("word_choice"), "word_choice")
    register = _text(reply.get("register")).lower()
    note = _text(reply.get("register_note_vi"))
    better = _text(reply.get("better_version"))
    issues = grammar + word_choice
    focus = issues[0] if issues else None
    return ContentFeedback.model_validate(
        {
            "grammar": grammar,
            "word_choice": word_choice,
            "formality": register if register in REGISTERS else None,
            "formality_note_vi": note if note and not is_about_pronunciation(note) else None,
            "better_version": better or None,
            "focus": focus,
            "model": model,
        }
    )


class ContentFeedbackService:
    """Ask the configured chat model about one transcript."""

    def __init__(self, client: ChatClient, model: str) -> None:
        self._client = client
        self._model = model

    @property
    def model(self) -> str:
        """The chat model that writes the feedback."""
        return self._model

    def reply(self, transcript: str, task_vi: str | None = None) -> dict[str, Any]:
        """The model's raw JSON for one transcript (the evaluation counts what it proposed)."""
        said = transcript.strip()
        user = said if not task_vi else f"Task: {task_vi}\nLearner said: {said}"
        messages: list[dict[str, object]] = [
            {"role": "system", "content": SYSTEM_FEEDBACK},
            {"role": "user", "content": user},
        ]
        return parse_reply(self._client.complete(self._model, messages))

    def feedback(self, transcript: str, task_vi: str | None = None) -> ContentFeedback:
        """Feedback on one transcript; the task (Vietnamese) helps judge the register."""
        return build_feedback(self.reply(transcript, task_vi), self._model)
