"""Every symbol table maps into the 39-phone inventory and the model vocabulary is covered."""

from app.domain import phoneme_inventory as inv
from app.domain.phoneme_inventory import Phone, arpabet_variants, espeak_to_arpabet, parse_cmu
from tests.fakes import VOCAB

ENGLISH_TOKENS = [
    "ɑː", "æ", "ʌ", "ə", "ɔː", "aʊ", "aɪ", "ɛ", "ɜː", "ɚ", "eɪ", "ɪ", "iː", "oʊ", "ɔɪ", "ʊ", "uː",
    "b", "d", "ɡ", "k", "p", "t", "ɾ", "tʃ", "dʒ", "ð", "f", "h", "s", "ʃ", "θ", "v", "z", "ʒ",
    "m", "n", "ŋ", "l", "ɹ", "w", "j", "əl", "ɑːɹ", "ɔːɹ", "ɛɹ", "ɪɹ", "ʊɹ", "aɪɚ",
]  # fmt: skip


def test_every_mapping_target_is_a_known_phone() -> None:
    for targets in inv.ESPEAK_TO_ARPABET.values():
        for symbol in targets:
            assert symbol in inv.ARPABET


def test_every_phone_has_an_ipa_glyph_and_a_class() -> None:
    assert set(inv.ARPABET_IPA) == set(inv.ARPABET)
    assert len(inv.ARPABET) == 39


def test_english_tokens_of_the_model_vocabulary_are_mapped() -> None:
    missing = [token for token in ENGLISH_TOKENS if token not in VOCAB]
    assert missing == []
    unmapped = [token for token in ENGLISH_TOKENS if token not in inv.ESPEAK_TO_ARPABET]
    assert unmapped == []


def test_every_mapped_token_exists_in_the_model_vocabulary() -> None:
    assert [token for token in inv.ESPEAK_TO_ARPABET if token not in VOCAB] == []


def test_each_phone_has_at_least_one_single_token_variant() -> None:
    assert [symbol for symbol in inv.ARPABET if not arpabet_variants(symbol)] == []


def test_parse_cmu_keeps_stress_on_vowels_only() -> None:
    phones = parse_cmu(["AH0", "B", "AW1", "T"])
    assert phones == [Phone("AH", 0), Phone("B"), Phone("AW", 1), Phone("T")]
    assert [phone.is_vowel for phone in phones] == [True, False, True, False]


def test_unstressed_schwa_is_shown_as_schwa() -> None:
    assert Phone("AH", 0).ipa == "ə"
    assert Phone("AH", 1).ipa == "ʌ"
    assert Phone("ER", 0).ipa == "ɚ"
    assert Phone("XX").ipa == "?"


def test_unknown_tokens_become_question_marks_and_multi_phone_tokens_expand() -> None:
    assert espeak_to_arpabet(["θ", "ɪ", "ŋ", "k", "ʁ", "əl"]) == [
        "TH",
        "IH",
        "NG",
        "K",
        "?",
        "AH",
        "L",
    ]
