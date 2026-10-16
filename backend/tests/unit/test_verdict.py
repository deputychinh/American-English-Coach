import pytest

from app.domain.verdict import audio_verdict
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
