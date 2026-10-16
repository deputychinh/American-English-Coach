import numpy as np
from numpy.typing import NDArray

from app.domain.prosody import ProsodyAnalyzer, SyllableNucleus, semitones
from app.enums import ProsodyAspect, Verdict

HOP = 0.01


def tracks(seconds: float, rising: bool | None) -> tuple[NDArray[np.float64], NDArray[np.float64]]:
    frames = int(seconds / HOP)
    f0 = np.full(frames, 150.0)
    if rising is True:
        f0[-40:] = np.linspace(150, 200, 40)
    if rising is False:
        f0[-40:] = np.linspace(150, 110, 40)
    rms = np.full(frames, 0.05)
    return f0, rms


def test_semitones_are_relative_to_the_voiced_median() -> None:
    st = semitones(np.array([100.0, np.nan, 200.0, 100.0]))
    assert st[0] == 0.0
    assert np.isnan(st[1])
    assert round(float(st[2]), 1) == 12.0
    assert np.isnan(semitones(np.array([np.nan]))).all()


def test_word_stress_on_the_longer_louder_syllable_is_ok() -> None:
    f0, rms = tracks(1.0, None)
    rms[10:40] = 0.2  # first syllable long and loud
    analyzer = ProsodyAnalyzer(f0, rms, HOP)
    nuclei = [SyllableNucleus(0, 1, 0.10, 0.40), SyllableNucleus(0, 0, 0.50, 0.60)]
    findings = analyzer.analyze(nuclei, ["record"], None)
    assert len(findings) == 1
    assert findings[0].aspect is ProsodyAspect.WORD_STRESS
    assert findings[0].verdict is Verdict.OK


def test_word_stress_on_the_wrong_syllable_is_a_check_with_advice() -> None:
    f0, rms = tracks(1.0, None)
    rms[50:90] = 0.3
    analyzer = ProsodyAnalyzer(f0, rms, HOP)
    nuclei = [SyllableNucleus(0, 1, 0.10, 0.15), SyllableNucleus(0, 0, 0.50, 0.90)]
    finding = analyzer.analyze(nuclei, ["record"], None)[0]
    assert finding.verdict is Verdict.CHECK
    assert "âm tiết 1" in finding.detail_vi


def test_final_contour_rise_for_questions_and_fall_for_statements() -> None:
    f0, rms = tracks(1.0, True)
    assert ProsodyAnalyzer(f0, rms, HOP).analyze([], [], True)[0].verdict is Verdict.OK
    assert ProsodyAnalyzer(f0, rms, HOP).analyze([], [], False)[0].verdict is Verdict.CHECK
    f0, rms = tracks(1.0, False)
    assert ProsodyAnalyzer(f0, rms, HOP).analyze([], [], False)[0].verdict is Verdict.OK


def test_no_contour_finding_without_voicing_or_expectation() -> None:
    silent = np.full(50, np.nan)
    assert ProsodyAnalyzer(silent, np.zeros(50), HOP).analyze([], [], True) == []
    f0, rms = tracks(1.0, True)
    assert ProsodyAnalyzer(f0, rms, HOP).analyze([], [], None) == []


def test_rhythm_compares_stressed_and_unstressed_vowel_lengths() -> None:
    f0, rms = tracks(2.0, None)
    even = [SyllableNucleus(i, i % 2, i * 0.3, i * 0.3 + 0.1) for i in range(4)]
    uneven = [
        SyllableNucleus(i, i % 2, i * 0.3, i * 0.3 + (0.2 if i % 2 else 0.1)) for i in range(4)
    ]
    analyzer = ProsodyAnalyzer(f0, rms, HOP)
    assert analyzer.analyze(even, ["a", "b", "c", "d"], None)[-1].verdict is Verdict.CHECK
    assert analyzer.analyze(uneven, ["a", "b", "c", "d"], None)[-1].verdict is Verdict.OK
