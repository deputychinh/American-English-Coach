"""`content/fluency.json`: one "Nói 3 lần" (4/3/2) prompt per unit (plan v2, V4)."""

import json
import re
from pathlib import Path

import pytest

from app.domain.pronouncing import PronouncingDictionary

ROOT = Path(__file__).resolve().parents[3]
FLUENCY = json.loads((ROOT / "content" / "fluency.json").read_text(encoding="utf-8"))
CURRICULUM = json.loads((ROOT / "content" / "curriculum.json").read_text(encoding="utf-8"))
UNITS = [unit["id"] for level in CURRICULUM["levels"] for unit in level["units"]]


@pytest.fixture(scope="module")
def dictionary() -> PronouncingDictionary:
    return PronouncingDictionary.load(ROOT / "vendor" / "cmudict.dict")


def test_rounds_shrink_like_four_three_two() -> None:
    assert FLUENCY["schema"] == "aec-fluency/1"
    rounds = FLUENCY["rounds"]
    assert len(rounds) == 3
    assert rounds == sorted(rounds, reverse=True)
    assert len(set(rounds)) == 3


def test_every_unit_has_one_complete_prompt() -> None:
    prompts = FLUENCY["prompts"]
    assert [p["unit"] for p in prompts] == UNITS
    assert len({p["id"] for p in prompts}) == len(prompts)
    for prompt in prompts:
        assert prompt["id"] == f"fl.{prompt['unit']}"
        assert prompt["title_vi"].strip(), prompt["id"]
        assert prompt["title_en"].strip(), prompt["id"]
        assert len(prompt["ideas_vi"]) == 3, prompt["id"]
        assert all(idea.strip() for idea in prompt["ideas_vi"]), prompt["id"]
        assert len(prompt["phrases"]) == 3, prompt["id"]
        for phrase in prompt["phrases"]:
            assert phrase["en"].strip(), prompt["id"]
            assert phrase["vi"].strip(), prompt["id"]


def test_the_scorer_knows_every_word_of_the_phrases(dictionary: PronouncingDictionary) -> None:
    words = {
        word
        for prompt in FLUENCY["prompts"]
        for phrase in prompt["phrases"]
        for word in re.findall(r"[a-z']+", phrase["en"].lower())
    }
    assert {word for word in words if not dictionary.lookup(word)} == set()
