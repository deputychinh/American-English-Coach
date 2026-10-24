"""Content feedback (plan v2 V6): JSON parsing, the pronunciation rule and the evaluation."""

from typing import Any

import pytest

from app.errors import TutorUnavailableError
from app.eval.feedback_eval import PRECISION_TARGET, EvalItem, LabelledError, load_items, score
from app.services.feedback_service import build_feedback, is_about_pronunciation, parse_reply

AGREE = "Chủ ngữ ngôi ba cần động từ thêm -s."


def issue(wrong: str, right: str, explain: str = AGREE) -> dict[str, str]:
    return {"wrong": wrong, "right": right, "explain_vi": explain}


def test_reply_json_is_found_inside_fences_and_chatter() -> None:
    text = 'Sure!\n```json\n{"grammar": [], "better_version": null}\n```'
    assert parse_reply(text) == {"grammar": [], "better_version": None}
    for broken in ("I think it is fine.", '{"grammar": [}', "[1, 2]"):
        with pytest.raises(TutorUnavailableError):
            parse_reply(broken)


def test_pronunciation_remarks_never_reach_the_learner() -> None:
    reply = {
        "grammar": [
            issue("work", "works"),
            issue("work", "works", "Bạn nuốt âm cuối /s/, hãy phát âm rõ."),
        ],
        "word_choice": [issue("open the light", "turn on the light", "Accent is strong here.")],
        "register": "Casual",
        "register_note_vi": "Ngữ điệu hơi đều.",
        "better_version": "My mother works at a hospital.",
    }
    feedback = build_feedback(reply, "m")
    assert [i.right for i in feedback.grammar] == ["works"]
    assert feedback.word_choice == []
    assert feedback.formality == "casual"
    assert feedback.formality_note_vi is None
    assert feedback.focus is not None
    assert feedback.focus.wrong == "work"
    # A correction that merely contains "sound" is about meaning, not pronunciation.
    assert not is_about_pronunciation("Dùng 'sounds good' tự nhiên hơn.")
    assert is_about_pronunciation("Trọng âm sai ở từ này.")


def test_malformed_and_empty_items_are_dropped_and_at_most_three_kept() -> None:
    reply: dict[str, Any] = {
        "grammar": [
            "not an object",
            issue("", "x"),
            issue("same", "Same"),
            *[issue(f"w{n}", f"r{n}") for n in range(5)],
        ],
        "word_choice": None,
        "register": "slangy",
    }
    feedback = build_feedback(reply, "m")
    assert [i.wrong for i in feedback.grammar] == ["w0", "w1", "w2"]
    assert feedback.formality is None
    assert feedback.better_version is None
    assert build_feedback({"grammar": [], "word_choice": []}, "m").focus is None


def test_the_word_choice_issue_is_the_focus_when_grammar_is_clean() -> None:
    choice = issue("make my homework", "do my homework", "Ta nói 'do homework'.")
    feedback = build_feedback({"grammar": [], "word_choice": [choice]}, "m")
    assert feedback.focus is not None
    assert feedback.focus.kind == "word_choice"


def test_evaluation_set_has_fifty_labelled_errors_and_clean_sentences() -> None:
    items = load_items()
    assert len({item.id for item in items}) == len(items) == 60
    assert sum(len(item.errors) == 1 for item in items) == 50
    for item in items:
        for error in item.errors:
            assert error.wrong.lower() in item.text.lower(), item.id


def test_scoring_counts_precision_recall_false_alarms_and_raw_remarks() -> None:
    items = [
        EvalItem("a", "He don't like coffee.", (LabelledError("grammar", "don't", "doesn't"),)),
        EvalItem("b", "I very like it.", (LabelledError("grammar", "very like", "really like"),)),
        EvalItem("c", "I work here.", ()),
    ]
    replies = {
        "a": {"grammar": [issue("don't", "doesn't")]},
        "b": {"grammar": [issue("it", "this"), issue("very like", "like", "Phát âm sai.")]},
        "c": {"word_choice": [issue("work here", "am working here")]},
    }
    report = score(items, replies)
    assert (report.reported, report.correct, report.found) == (3, 1, 1)
    assert report.false_alarms == 1
    assert report.pronunciation_remarks == 1
    assert report.precision == pytest.approx(1 / 3, abs=1e-3)
    assert report.recall == 0.5
    assert report.passed is False


def test_a_model_that_reports_exactly_the_labels_passes() -> None:
    items = load_items()
    replies = {
        item.id: {"grammar": [issue(e.wrong, e.right, "Sửa như sau.") for e in item.errors]}
        for item in items
    }
    report = score(items, replies)
    assert report.precision == 1.0
    assert report.recall == 1.0
    assert report.passed
    assert PRECISION_TARGET == 0.8
