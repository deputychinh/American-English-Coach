import json

from app.eval.vocab_draft import OUT, build, merge, slug


def test_committed_deck_matches_the_curriculum() -> None:
    # Regenerate with scripts/build_vocab_draft.py after changing a unit's role-play.
    assert json.loads(OUT.read_text(encoding="utf-8")) == build()


def test_every_item_is_complete_and_unique() -> None:
    items = build()["items"]
    assert len({item["id"] for item in items}) == len(items) >= 150
    for item in items:
        assert item["kind"] in {"word", "chunk"}
        assert item["review"] in {"draft", "approved"}
        assert item["meaning_vi"].strip(), item["id"]
        assert item["example"]["en"].strip(), item["id"]
        assert item["example"]["vi"].strip(), item["id"]
        assert item["ipa"], item["id"]
        assert "?" not in item["ipa"], item["id"]
        assert item["units"]
        assert 1 <= item["level"] <= 4


def test_level_one_has_enough_items_to_start() -> None:
    assert sum(item["level"] == 1 for item in build()["items"]) >= 40


def test_a_rerun_keeps_human_edits_and_refreshes_derived_fields() -> None:
    derived = [{"id": "w.cup", "kind": "word", "text": "cup", "ipa": "kʌp", "units": ["u02"],
                "level": 1, "meaning_vi": "", "review": "draft"}]  # fmt: skip
    edited = [{**derived[0], "ipa": "old", "meaning_vi": "cái cốc", "review": "approved"}]
    assert merge(derived, edited) == [{**derived[0], "meaning_vi": "cái cốc", "review": "approved"}]


def test_slug_is_stable() -> None:
    assert slug("Can't stop, I've got to go!") == "cant-stop-ive-got-to-go"
