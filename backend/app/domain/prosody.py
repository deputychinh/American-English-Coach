"""Word stress, final contour and rhythm from pitch/energy tracks and phone timing."""

from dataclasses import dataclass

import numpy as np
from numpy.typing import NDArray

from app.constants import (
    MIN_NUCLEI_FOR_RHYTHM,
    MIN_SYLLABLES_FOR_STRESS,
    PROSODY_FINAL_SEMITONES,
    PROSODY_STRESS_RATIO_MIN,
)
from app.enums import ProsodyAspect, Verdict

FINAL_WINDOW_SECONDS = 0.35
MIN_VOICED_FRAMES = 4


@dataclass(frozen=True, slots=True)
class SyllableNucleus:
    """A vowel segment: which word it belongs to, its lexical stress and its time span."""

    word_index: int
    stress: int
    start: float
    end: float


@dataclass(frozen=True, slots=True)
class ProsodyFinding:
    """One prosody observation with a learner-facing explanation."""

    aspect: ProsodyAspect
    verdict: Verdict
    detail_vi: str
    word_index: int | None = None


def semitones(f0: NDArray[np.float64]) -> NDArray[np.float64]:
    """Hz → semitones relative to the voiced median; NaN stays NaN."""
    voiced = f0[~np.isnan(f0)]
    if voiced.size == 0:
        return f0
    return 12.0 * np.log2(f0 / np.median(voiced))


class ProsodyAnalyzer:
    """Rule-based prosody checks; every finding is at most `check` (plan D12)."""

    def __init__(
        self, f0: NDArray[np.float64], rms: NDArray[np.float64], hop_seconds: float
    ) -> None:
        self._st = semitones(f0)
        self._rms = rms
        self._hop = hop_seconds

    def analyze(
        self, nuclei: list[SyllableNucleus], words: list[str], expected_rise: bool | None
    ) -> list[ProsodyFinding]:
        """Run the word-stress, final-contour and rhythm checks that have enough data."""
        findings = [finding for finding in self._word_stress(nuclei, words) if finding]
        contour = self._final_contour(expected_rise)
        if contour:
            findings.append(contour)
        rhythm = self._rhythm(nuclei)
        if rhythm:
            findings.append(rhythm)
        return findings

    def _prominence(self, nucleus: SyllableNucleus) -> float:
        start, end = int(nucleus.start / self._hop), max(int(nucleus.end / self._hop), 1)
        energy = float(self._rms[start:end].mean()) if end > start else 0.0
        pitch = self._st[start:end]
        voiced = pitch[~np.isnan(pitch)]
        pitch_term = float(voiced.mean()) if voiced.size else 0.0
        return (nucleus.end - nucleus.start) * 10.0 + energy * 20.0 + pitch_term * 0.1

    def _word_stress(
        self, nuclei: list[SyllableNucleus], words: list[str]
    ) -> list[ProsodyFinding | None]:
        findings: list[ProsodyFinding | None] = []
        for index, word in enumerate(words):
            syllables = [n for n in nuclei if n.word_index == index]
            if (
                len(syllables) < MIN_SYLLABLES_FOR_STRESS
                or sum(1 for n in syllables if n.stress == 1) != 1
            ):
                continue
            expected = next(i for i, n in enumerate(syllables) if n.stress == 1)
            observed = int(np.argmax([self._prominence(n) for n in syllables]))
            if observed == expected:
                detail = f"Trọng âm của '{word}' đúng vị trí."
                findings.append(
                    ProsodyFinding(ProsodyAspect.WORD_STRESS, Verdict.OK, detail, index)
                )
            else:
                findings.append(
                    ProsodyFinding(
                        ProsodyAspect.WORD_STRESS,
                        Verdict.CHECK,
                        (
                            f"Trọng âm của '{word}' nên rơi vào âm tiết {expected + 1}, "
                            f"bạn đang nhấn âm tiết {observed + 1}. "
                            "Kéo dài và lên giọng ở âm tiết đó."
                        ),
                        index,
                    )
                )
        return findings

    def _final_contour(self, expected_rise: bool | None) -> ProsodyFinding | None:
        if expected_rise is None:
            return None
        voiced_idx = np.flatnonzero(~np.isnan(self._st))
        if voiced_idx.size < MIN_VOICED_FRAMES:
            return None
        window = max(int(FINAL_WINDOW_SECONDS / self._hop), MIN_VOICED_FRAMES)
        tail = self._st[voiced_idx[-window:]]
        third = max(len(tail) // 3, 1)
        delta = float(tail[-third:].mean() - tail[:third].mean())
        rises = delta > PROSODY_FINAL_SEMITONES
        falls = delta < -PROSODY_FINAL_SEMITONES
        if (expected_rise and rises) or (not expected_rise and falls):
            return ProsodyFinding(
                ProsodyAspect.FINAL_CONTOUR, Verdict.OK, "Ngữ điệu cuối câu phù hợp."
            )
        wanted = "lên giọng" if expected_rise else "xuống giọng"
        return ProsodyFinding(
            ProsodyAspect.FINAL_CONTOUR,
            Verdict.CHECK,
            (f"Cuối câu nên {wanted} rõ hơn (thay đổi đo được {delta:+.1f} bán cung)."),
        )

    def _rhythm(self, nuclei: list[SyllableNucleus]) -> ProsodyFinding | None:
        stressed = [n.end - n.start for n in nuclei if n.stress == 1]
        unstressed = [n.end - n.start for n in nuclei if n.stress == 0]
        too_few = min(len(stressed), len(unstressed)) < MIN_NUCLEI_FOR_RHYTHM
        if too_few:
            return None
        ratio = float(np.mean(stressed) / max(np.mean(unstressed), 1e-3))
        if ratio >= PROSODY_STRESS_RATIO_MIN:
            return ProsodyFinding(
                ProsodyAspect.RHYTHM,
                Verdict.OK,
                "Âm tiết nhấn dài hơn âm tiết không nhấn: nhịp tự nhiên.",
            )
        return ProsodyFinding(
            ProsodyAspect.RHYTHM,
            Verdict.CHECK,
            (
                f"Các âm tiết đang dài gần bằng nhau (tỷ lệ {ratio:.2f}). "
                "Kéo dài âm tiết nhấn, đọc nhẹ và ngắn các âm yếu."
            ),
        )
