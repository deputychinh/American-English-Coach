"""Rule table combining the audio verdict with the visual verdict (plan §5)."""

from app.enums import Verdict, VisualVerdict

HIGH_CONFIDENCE = "high"
LOW_CONFIDENCE = "low"


class FusionRules:
    """Audio is primary evidence; vision can raise `check` to `error` or add a mouth hint.

    How much the camera may say depends on how visible the sound is: only lip sounds the camera
    sees clearly (P/B/M, F/V, rounded vowels) can turn `check` into `error`; tongue sounds the
    camera barely sees (T/D/N/L, K/G, R) never change the verdict or add a mouth hint.
    """

    @staticmethod
    def fuse(
        audio: Verdict, visual: VisualVerdict, confidence: str = HIGH_CONFIDENCE
    ) -> tuple[Verdict, bool]:
        """Return the shown verdict and whether a mouth-shape hint should accompany it."""
        if visual is not VisualVerdict.OFF or confidence == LOW_CONFIDENCE:
            return audio, False
        if audio is Verdict.CHECK and confidence == HIGH_CONFIDENCE:
            return Verdict.ERROR, True
        return audio, True
