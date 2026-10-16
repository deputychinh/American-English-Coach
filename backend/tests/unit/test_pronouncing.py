import pytest

from app.config.settings import REPO_ROOT
from app.domain.pronouncing import PronouncingDictionary
from app.errors import WordUnknownError

DICTIONARY = PronouncingDictionary.load(REPO_ROOT / "vendor" / "cmudict.dict")


def test_dictionary_loads_many_words_with_variants() -> None:
    assert len(DICTIONARY) > 100_000
    record = DICTIONARY.lookup("record")
    assert record is not None
    assert len(record.variants) >= 2
    seconds = {phones[1].symbol for phones in record.variants}
    assert {"EH", "AH"} <= seconds  # REcord (noun) and reCORD (verb)


def test_text_is_tokenised_without_punctuation_and_keeps_apostrophes() -> None:
    assert DICTIONARY.tokenize("Don't stop, please!") == ["don't", "stop", "please"]
    assert [w.word for w in DICTIONARY.for_text("I think.")] == ["i", "think"]


def test_unknown_word_raises_a_typed_error() -> None:
    assert DICTIONARY.lookup("xqzvv") is None
    with pytest.raises(WordUnknownError):
        DICTIONARY.for_text("hello xqzvv")
