"""Rule table combining the audio verdict with the visual verdict (plan §5)."""

from app.enums import Verdict, VisualVerdict


class FusionRules:
    """Audio is primary evidence; vision can raise `check` to `error` or add a mouth hint."""

    @staticmethod
    def fuse(audio: Verdict, visual: VisualVerdict) -> tuple[Verdict, bool]:
        """Return the shown verdict and whether a mouth-shape hint should accompany it."""
        if visual is VisualVerdict.UNAVAILABLE:
            return audio, False
        if visual is VisualVerdict.OK:
            return audio, False
        if audio is Verdict.OK:
            return Verdict.OK, True
        return Verdict.ERROR, True
