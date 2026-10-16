from app.config.settings import REPO_ROOT
from app.domain.viseme import VisemeCatalog
from app.enums import VisemeGroup, VisualVerdict

CATALOG = VisemeCatalog.load(REPO_ROOT / "content")
ROUND = {
    "aperture": 0.3,
    "width": 0.2,
    "roundness": 0.9,
    "jaw": 0.2,
    "lipClosed": 0.0,
    "lowerLipTuck": 0.0,
}
FLAT = {
    "aperture": 0.3,
    "width": 0.8,
    "roundness": 0.1,
    "jaw": 0.2,
    "lipClosed": 0.0,
    "lowerLipTuck": 0.0,
}


def test_sounds_map_to_groups_and_invisible_sounds_do_not() -> None:
    assert CATALOG.group_of("UW") is VisemeGroup.ROUNDED
    assert CATALOG.group_of("P") is VisemeGroup.LIPS_CLOSED
    assert CATALOG.group_of("K") is VisemeGroup.RELAXED
    assert CATALOG.target(VisemeGroup.RELAXED).confidence == "low"
    assert CATALOG.transition_of("AY") is not None
    assert CATALOG.transition_of("K") is None
    assert CATALOG.feature_names[0] == "aperture"
    assert CATALOG.target(VisemeGroup.ROUNDED).hold_ms > 0


def test_round_lips_pass_the_uw_target_and_flat_lips_fail() -> None:
    assert CATALOG.evaluate("UW", [ROUND, ROUND, ROUND]) is VisualVerdict.OK
    assert CATALOG.evaluate("UW", [FLAT, FLAT, FLAT]) is VisualVerdict.OFF


def test_short_windows_invisible_sounds_and_empty_frames_are_unavailable() -> None:
    assert CATALOG.evaluate("UW", [ROUND]) is VisualVerdict.UNAVAILABLE
    assert CATALOG.evaluate("K", [ROUND, ROUND]) is not VisualVerdict.UNAVAILABLE
    assert CATALOG.evaluate("UW", [{}, {}]) is VisualVerdict.UNAVAILABLE
