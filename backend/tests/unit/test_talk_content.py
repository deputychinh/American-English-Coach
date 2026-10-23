"""`content/talk.json`: functional phrases and spoken patterns (plan v2, V3)."""

import json
import re
from pathlib import Path
from typing import Any

import pytest

from app.domain.pronouncing import PronouncingDictionary

ROOT = Path(__file__).resolve().parents[3]
TALK = json.loads((ROOT / "content" / "talk.json").read_text(encoding="utf-8"))
CURRICULUM = json.loads((ROOT / "content" / "curriculum.json").read_text(encoding="utf-8"))
UNITS = [unit["id"] for level in CURRICULUM["levels"] for unit in level["units"]]
REGISTERS = ("casual", "neutral", "formal")
# The last sound a grammar ending adds, in ARPAbet (worked /t/, played /d/, cups /s/, pens /z/).
ENDING_PHONES = {"s": {"S", "Z"}, "ed": {"T", "D"}}


@pytest.fixture(scope="module")
def dictionary() -> PronouncingDictionary:
    return PronouncingDictionary.load(ROOT / "vendor" / "cmudict.dict")


def _spoken(talk: dict[str, Any]) -> list[str]:
    phrases = [p["en"] for f in talk["functions"] for p in f["phrases"].values()]
    drills = [d for p in talk["patterns"] for d in p["drills"]]
    return phrases + [d["prompt"] for d in drills] + [d["answer"] for d in drills]


def _words(text: str) -> list[str]:
    return re.findall(r"[a-z']+", text.lower().replace("’", "'"))


def _contains(text: str, part: str) -> bool:
    words, wanted = _words(text), _words(part)
    return any(words[i : i + len(wanted)] == wanted for i in range(len(words)))


def test_twelve_functions_in_three_registers() -> None:
    functions = TALK["functions"]
    assert TALK["schema"] == "aec-talk/1"
    assert len(functions) == len({f["id"] for f in functions}) == 12
    for function in functions:
        assert tuple(function["phrases"]) == REGISTERS, function["id"]
        assert tuple(function["situations"]) == REGISTERS, function["id"]
        texts = [p["en"] for p in function["phrases"].values()]
        assert len(set(texts)) == len(REGISTERS), function["id"]
        assert all(p["vi"].strip() for p in function["phrases"].values()), function["id"]
        assert all(s.strip() for s in function["situations"].values()), function["id"]
        assert set(function["units"]) <= set(UNITS), function["id"]


def test_every_unit_has_a_function_and_one_pattern() -> None:
    with_function = {unit for f in TALK["functions"] for unit in f["units"]}
    assert with_function == set(UNITS)
    assert [p["unit"] for p in TALK["patterns"]] == UNITS


def test_drills_are_complete_and_unique() -> None:
    drills = [d for p in TALK["patterns"] for d in p["drills"]]
    assert len({d["id"] for d in drills}) == len(drills) >= 4 * len(UNITS)
    for pattern in TALK["patterns"]:
        assert pattern["ending"] in {None, *ENDING_PHONES}, pattern["id"]
        assert pattern["rule_vi"].strip(), pattern["id"]
        for drill in pattern["drills"]:
            assert drill["id"].startswith(f"{pattern['id']}."), drill["id"]
            assert drill["prompt"] != drill["answer"], drill["id"]
            assert drill["cue"].strip(), drill["id"]
            assert drill["vi"].strip(), drill["id"]
            assert _contains(drill["answer"], drill["target"]), drill["id"]


def test_the_scorer_knows_every_word_the_learner_says(dictionary: PronouncingDictionary) -> None:
    unknown = {w for text in _spoken(TALK) for w in _words(text) if not dictionary.lookup(w)}
    assert unknown == set()


def test_ending_drills_end_their_target_in_the_ending_sound(
    dictionary: PronouncingDictionary,
) -> None:
    checked = 0
    for pattern in TALK["patterns"]:
        if pattern["ending"] is None:
            continue
        for drill in pattern["drills"]:
            entry = dictionary.lookup(_words(drill["target"])[-1])
            assert entry is not None, drill["id"]
            assert entry.primary[-1].symbol in ENDING_PHONES[pattern["ending"]], drill["id"]
            checked += 1
    assert checked >= 16
