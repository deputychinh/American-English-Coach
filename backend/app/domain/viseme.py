"""Visible mouth-shape targets per sound and the comparison with the learner's features."""

import json
import statistics
from dataclasses import dataclass
from pathlib import Path

from app.enums import VisemeGroup, VisualVerdict

MIN_WINDOW_FRAMES = 2


@dataclass(frozen=True, slots=True)
class VisemeTarget:
    """Target ranges (0 to 1 after personal calibration) for one group of sounds."""

    group: VisemeGroup
    name_vi: str
    sounds: tuple[str, ...]
    targets: dict[str, tuple[float | None, float | None]]
    hold_ms: int
    hint_vi: str
    common_error_vi: str
    confidence: str = "medium"

    def off_features(self, features: dict[str, float]) -> list[str]:
        """Feature names outside their target range."""
        off: list[str] = []
        for name, (low, high) in self.targets.items():
            value = features.get(name)
            if value is None:
                continue
            if (low is not None and value < low) or (high is not None and value > high):
                off.append(name)
        return off


class VisemeCatalog:
    """Loads `visemes.json`; maps sounds to groups and judges feature windows."""

    def __init__(self, targets: dict[VisemeGroup, VisemeTarget], features: tuple[str, ...]) -> None:
        self._targets = targets
        self._features = features
        self._extra: dict[str, dict[str, str]] = {}
        self._group_of = {
            sound: group for group, target in targets.items() for sound in target.sounds
        }

    @classmethod
    def load(cls, content_dir: Path) -> "VisemeCatalog":
        """Read the content file."""
        raw = json.loads((content_dir / "visemes.json").read_text(encoding="utf-8"))
        targets = {
            VisemeGroup(key): VisemeTarget(
                group=VisemeGroup(key),
                name_vi=item["name_vi"],
                sounds=tuple(item["sounds"]),
                targets={
                    name: (bounds.get("min"), bounds.get("max"))
                    for name, bounds in item["targets"].items()
                },
                hold_ms=int(item["hold_ms"]),
                hint_vi=item["hint_vi"],
                common_error_vi=item["common_error_vi"],
                confidence=str(item.get("confidence", "medium")),
            )
            for key, item in raw["groups"].items()
        }
        catalog = cls(targets, tuple(raw["features"]))
        catalog._extra = {k: dict(v) for k, v in raw.get("sounds_extra", {}).items()}
        return catalog

    @property
    def feature_names(self) -> tuple[str, ...]:
        """Feature names the browser must send, in content order."""
        return self._features

    @property
    def groups(self) -> list[VisemeGroup]:
        """Groups in content order."""
        return list(self._targets)

    def transition_of(self, symbol: str) -> str | None:
        """Start→end description for diphthongs and r-coloured vowels."""
        return self._extra.get(symbol, {}).get("transition_vi")

    def group_of(self, symbol: str) -> VisemeGroup | None:
        """Viseme group of a phone; `None` when the camera cannot see the sound."""
        return self._group_of.get(symbol)

    def confidence_of(self, symbol: str) -> str:
        """How well the camera sees a sound: 'high', 'medium' or 'low' ('low' if unseen)."""
        group = self.group_of(symbol)
        return self._targets[group].confidence if group is not None else "low"

    def target(self, group: VisemeGroup) -> VisemeTarget:
        """Target definition of a group."""
        return self._targets[group]

    def evaluate(self, symbol: str, window: list[dict[str, float]]) -> VisualVerdict:
        """Compare the median features of a time window with the sound's target."""
        group = self.group_of(symbol)
        if group is None or len(window) < MIN_WINDOW_FRAMES:
            return VisualVerdict.UNAVAILABLE
        medians = {
            name: statistics.median(frame[name] for frame in window if name in frame)
            for name in self._features
            if any(name in frame for frame in window)
        }
        if not medians:
            return VisualVerdict.UNAVAILABLE
        return (
            VisualVerdict.OK
            if not self._targets[group].off_features(medians)
            else VisualVerdict.OFF
        )
