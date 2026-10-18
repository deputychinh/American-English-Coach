from pathlib import Path

import pytest

from app.config.settings import REPO_ROOT
from app.domain.error_catalog import ErrorCatalog
from app.domain.fusion import FusionRules
from app.enums import AlignmentOp, Verdict, VisualVerdict

CONTENT = REPO_ROOT / "content"


@pytest.mark.parametrize(
    ("audio", "confidence", "expected"),
    [
        (Verdict.CHECK, "medium", (Verdict.CHECK, True)),
        (Verdict.OK, "medium", (Verdict.OK, True)),
        (Verdict.CHECK, "low", (Verdict.CHECK, False)),
        (Verdict.OK, "low", (Verdict.OK, False)),
    ],
)
def test_only_clearly_visible_sounds_let_the_camera_raise_an_error(
    audio: Verdict, confidence: str, expected: tuple[Verdict, bool]
) -> None:
    assert FusionRules.fuse(audio, VisualVerdict.OFF, confidence) == expected


@pytest.mark.parametrize(
    ("audio", "visual", "expected"),
    [
        (Verdict.OK, VisualVerdict.OK, (Verdict.OK, False)),
        (Verdict.OK, VisualVerdict.OFF, (Verdict.OK, True)),
        (Verdict.CHECK, VisualVerdict.OFF, (Verdict.ERROR, True)),
        (Verdict.ERROR, VisualVerdict.OFF, (Verdict.ERROR, True)),
        (Verdict.ERROR, VisualVerdict.OK, (Verdict.ERROR, False)),
        (Verdict.CHECK, VisualVerdict.UNAVAILABLE, (Verdict.CHECK, False)),
        (Verdict.ERROR, VisualVerdict.UNAVAILABLE, (Verdict.ERROR, False)),
    ],
)
def test_fusion_truth_table(
    audio: Verdict, visual: VisualVerdict, expected: tuple[Verdict, bool]
) -> None:
    assert FusionRules.fuse(audio, visual) == expected


def test_catalog_loads_and_matches_vietnamese_errors(tmp_path: Path) -> None:
    enabled = tmp_path / "enabled.json"
    enabled.write_text('["th_to_t_s_f"]', encoding="utf-8")
    catalog = ErrorCatalog.load(CONTENT, enabled)
    th = catalog.find("TH", "T", AlignmentOp.SUBSTITUTION, is_final=False)
    assert th is not None
    assert th.id == "th_to_t_s_f"
    assert catalog.is_enabled(th)
    final_p = catalog.find("P", "", AlignmentOp.DELETION, is_final=True)
    assert final_p is not None
    assert final_p.id == "final_p_dropped"
    assert not catalog.is_enabled(final_p)
    assert catalog.find("P", "", AlignmentOp.DELETION, is_final=False) is None
    assert catalog.find("TH", "AA", AlignmentOp.SUBSTITUTION, is_final=False) is None


def test_catalog_without_enabled_file_shows_nothing_as_error() -> None:
    catalog = ErrorCatalog.load(CONTENT, None)
    assert all(not catalog.is_enabled(error) for error in catalog.all)
    assert len(catalog.all) >= 25
