"""Catalogue of pronunciation errors typical for Vietnamese learners (content/vn_errors.json)."""

import json
from dataclasses import dataclass
from pathlib import Path

from app.enums import AlignmentOp, VisemeGroup


@dataclass(frozen=True, slots=True)
class KnownError:
    """One error pattern with the learner-facing explanation in Vietnamese."""

    id: str
    expected: str
    heard: tuple[str, ...]
    kind: AlignmentOp
    priority: int
    final_only: bool
    viseme_group: VisemeGroup | None
    hint_vi: str
    mouth_tip_vi: str

    def matches(self, expected: str, heard: str, op: AlignmentOp, is_final: bool) -> bool:
        """Does an alignment column realise this error?"""
        if expected != self.expected or op is not self.kind:
            return False
        if self.final_only and not is_final:
            return False
        return op is AlignmentOp.DELETION or heard in self.heard


class ErrorCatalog:
    """Loads the catalogue once and finds the best-matching known error for a column."""

    def __init__(self, errors: list[KnownError], enabled_ids: frozenset[str]) -> None:
        self._errors = sorted(errors, key=lambda error: error.priority)
        self._enabled = enabled_ids

    @classmethod
    def load(cls, content_dir: Path, enabled_path: Path | None = None) -> "ErrorCatalog":
        """Read `vn_errors.json` and the optional list of error ids allowed at level `error`."""
        raw = json.loads((content_dir / "vn_errors.json").read_text(encoding="utf-8"))
        errors = [
            KnownError(
                id=item["id"],
                expected=item["expected"],
                heard=tuple(item.get("heard", [])),
                kind=AlignmentOp(item["kind"]),
                priority=int(item["priority"]),
                final_only=bool(item.get("final_only", False)),
                viseme_group=VisemeGroup(item["viseme_group"])
                if item.get("viseme_group")
                else None,
                hint_vi=item["hint_vi"],
                mouth_tip_vi=item.get("mouth_tip_vi", ""),
            )
            for item in raw
        ]
        enabled: frozenset[str] = frozenset()
        if enabled_path is not None and enabled_path.exists():
            enabled = frozenset(json.loads(enabled_path.read_text(encoding="utf-8")))
        return cls(errors, enabled)

    def find(self, expected: str, heard: str, op: AlignmentOp, is_final: bool) -> KnownError | None:
        """Highest-priority known error matching the column, or `None`."""
        for error in self._errors:
            if error.matches(expected, heard, op, is_final):
                return error
        return None

    def is_enabled(self, error: KnownError) -> bool:
        """Only errors whose measured precision passed the gate may be shown as `error`."""
        return error.id in self._enabled

    @property
    def all(self) -> list[KnownError]:
        """Every catalogued error, highest priority first."""
        return list(self._errors)
