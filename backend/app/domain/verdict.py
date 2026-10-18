"""The audio verdict rule, shared by the assessment service and the evaluation scripts."""

from typing import Final

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


# Before /r/ General American does not keep tense and lax vowels apart, and the cure vowel is
# said several ways: near IH R ~ IY R, air EH R ~ EY R, tour UH R ~ UW R ~ AO R, sure UH R ~ ER.
# Hearing another member of the set is a free variant, not an error (data/eval/sound_sweep.json:
# a native voice was flagged on 17 of 19 cure-vowel words before this rule).
FREE_VARIANTS_BEFORE_R: Final[dict[str, frozenset[str]]] = {
    "IH": frozenset({"IY"}),
    "EH": frozenset({"EY", "AE"}),
    "UH": frozenset({"UW", "AO", "OW", "ER"}),
}


# Most American speakers merge the vowels of caught and cot; the merged AA is standard, so a
# learner (or a native voice: all, call, talk, draw in the sweep) is not wrong to use it.
FREE_VARIANTS: Final[dict[str, frozenset[str]]] = {"AO": frozenset({"AA"})}


def is_free_variant(expected: str, heard: str, next_symbol: str | None) -> bool:
    """True when `heard` is an accepted way of saying `expected` in this context."""
    if heard in FREE_VARIANTS.get(expected, frozenset()):
        return True
    return next_symbol == "R" and heard in FREE_VARIANTS_BEFORE_R.get(expected, frozenset())
