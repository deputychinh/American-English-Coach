import pytest

from app.domain.verdict import audio_verdict, is_free_variant
from app.enums import AlignmentOp, Verdict


@pytest.mark.parametrize(
    ("op", "gop", "enabled", "expected"),
    [
        (AlignmentOp.MATCH, 0.0, False, Verdict.OK),
        (AlignmentOp.MATCH, -2.9, False, Verdict.OK),
        (AlignmentOp.MATCH, -3.1, True, Verdict.CHECK),
        (AlignmentOp.SUBSTITUTION, -0.5, True, Verdict.OK),
        (AlignmentOp.DELETION, -1.9, True, Verdict.OK),
        (AlignmentOp.SUBSTITUTION, -2.1, False, Verdict.CHECK),
        (AlignmentOp.SUBSTITUTION, -2.1, True, Verdict.ERROR),
        (AlignmentOp.DELETION, -9.0, True, Verdict.ERROR),
    ],
)
def test_audio_verdict_rule(op: AlignmentOp, gop: float, enabled: bool, expected: Verdict) -> None:
    assert audio_verdict(op, gop, enabled) is expected


@pytest.mark.parametrize(
    ("expected", "heard", "next_symbol", "free"),
    [
        ("UH", "UW", "R", True),
        ("UH", "ER", "R", True),
        ("IH", "IY", "R", True),
        ("EH", "EY", "R", True),
        ("UH", "UW", "K", False),
        ("IH", "IY", None, False),
        ("UH", "AA", "R", False),
        ("TH", "T", "R", False),
        ("AO", "AA", "L", True),
        ("AO", "AA", None, True),
        ("AA", "AO", None, False),
    ],
)
def test_free_variants_are_merged_vowels_and_tense_lax_pairs_before_r(
    expected: str, heard: str, next_symbol: str | None, free: bool
) -> None:
    assert is_free_variant(expected, heard, next_symbol) is free
