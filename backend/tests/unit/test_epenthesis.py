"""Final epenthesis (plan B6): a vowel after a word-final obstruent, "book" said "bookə"."""

from app.domain.phoneme_inventory import Phone
from app.enums import AlignmentOp
from app.services.assessment_service import ExpectedPhone, _is_epenthesis


def final(symbol: str) -> ExpectedPhone:
    return ExpectedPhone(word_index=0, phone=Phone(symbol), is_final=True)


def test_a_vowel_inserted_after_a_final_obstruent() -> None:
    assert _is_epenthesis(final("K"), (AlignmentOp.MATCH, "K"), ["AH"])
    assert _is_epenthesis(final("SH"), (AlignmentOp.SUBSTITUTION, "S"), ["AA"])
    assert not _is_epenthesis(final("K"), (AlignmentOp.MATCH, "K"), ["T"])
    assert not _is_epenthesis(final("K"), (AlignmentOp.DELETION, ""), ["AH"])


def test_a_vowel_in_the_final_obstruents_own_column() -> None:
    assert _is_epenthesis(final("P"), (AlignmentOp.SUBSTITUTION, "AE"), [])
    assert not _is_epenthesis(final("P"), (AlignmentOp.SUBSTITUTION, "B"), [])


def test_not_after_sonorants_vowels_or_inside_a_word() -> None:
    for sonorant in ("L", "R", "M", "N", "NG"):
        assert not _is_epenthesis(final(sonorant), (AlignmentOp.MATCH, sonorant), ["AH"])
    assert not _is_epenthesis(final("IY"), (AlignmentOp.MATCH, "IY"), ["AH"])
    medial = ExpectedPhone(word_index=0, phone=Phone("K"), is_final=False)
    assert not _is_epenthesis(medial, (AlignmentOp.MATCH, "K"), ["AH"])
