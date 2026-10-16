"""Every chart sound has validated practice material (content/sound_drills.json)."""

import json

from app.config.settings import REPO_ROOT
from app.domain.pronouncing import PronouncingDictionary

DICTIONARY = PronouncingDictionary.load(REPO_ROOT / "vendor" / "cmudict.dict")
DRILLS = json.loads((REPO_ROOT / "content" / "sound_drills.json").read_text(encoding="utf-8"))


def test_44_sounds_with_enough_words_pairs_and_sentences() -> None:
    assert len(DRILLS) == 44
    for drill in DRILLS:
        assert len(drill["words"]) >= 6, drill["id"]
        assert len(drill["sentences"]) >= 2, drill["id"]
        assert drill["dropped"] == [], drill["id"]


def test_every_word_and_sentence_is_pronounceable() -> None:
    for drill in DRILLS:
        for item in drill["words"]:
            assert DICTIONARY.lookup(item["word"]) is not None, item["word"]
            assert item["position"] in {"initial", "medial", "final"}
        for sentence in drill["sentences"]:
            for token in DICTIONARY.tokenize(sentence["text"]):
                assert DICTIONARY.lookup(token) is not None, token
