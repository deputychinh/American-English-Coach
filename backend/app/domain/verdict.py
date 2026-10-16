"""The audio verdict rule, shared by the assessment service and the evaluation scripts."""

from app.constants import GOP_CHECK_THRESHOLD, GOP_OK_THRESHOLD
from app.enums import AlignmentOp, Verdict


def audio_verdict(op: AlignmentOp, gop: float, known_enabled: bool) -> Verdict:
    """Combine the alignment operation, the GOP and the catalogue gate into one verdict.

    A matched phone is `ok` unless its GOP is very low. When greedy decoding disagrees with the
    reference but forced alignment still supports the target (GOP above the ok threshold), the
    alignment wins and the phone is `ok`. Otherwise the phone is `error` only when the matching
    catalogue entry passed the precision gate; everything else is `check`.
    """
    if op is AlignmentOp.MATCH:
        return Verdict.OK if gop >= GOP_CHECK_THRESHOLD else Verdict.CHECK
    if gop >= GOP_OK_THRESHOLD:
        return Verdict.OK
    return Verdict.ERROR if known_enabled else Verdict.CHECK
