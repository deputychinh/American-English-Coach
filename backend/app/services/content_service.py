"""Lesson content read from `content/` (TSV + JSON, authored in Vietnamese)."""

import csv
import json
from pathlib import Path

from app.domain.error_catalog import ErrorCatalog
from app.domain.viseme import VisemeCatalog
from app.errors import NotFoundError
from app.schemas.content import (
    CalibrationStep,
    KnownErrorCard,
    MinimalPair,
    PhonemeCard,
    Sentence,
    SoundDrill,
    SoundDrillSummary,
    VisemeContent,
    VisemeTargetCard,
)


class ContentService:
    """Loads every content file once; all methods return API models."""

    def __init__(self, content_dir: Path, catalog: ErrorCatalog, visemes: VisemeCatalog) -> None:
        self._dir = content_dir
        self._catalog = catalog
        self._visemes = visemes
        self._phonemes = self._load_phonemes()
        self._pairs = [MinimalPair(**item) for item in self._read_json("minimal_pairs.json")]
        self._sentences = [Sentence(**item) for item in self._read_json("sentences.json")]
        self._drills = {str(item["id"]): item for item in self._read_json("sound_drills.json")}
        self._reliability = self._load_reliability()

    def _read_json(self, name: str) -> list[dict[str, object]]:
        items: list[dict[str, object]] = json.loads((self._dir / name).read_text(encoding="utf-8"))
        return items

    def _load_reliability(self) -> dict[str, str]:
        path = self._dir / "scorer_reliability.json"
        if not path.exists():
            return {}
        sounds: dict[str, dict[str, object]] = json.loads(path.read_text(encoding="utf-8"))[
            "sounds"
        ]
        return {sound_id: str(row["level"]) for sound_id, row in sounds.items()}

    def _load_phonemes(self) -> list[PhonemeCard]:
        with (self._dir / "phonemes.tsv").open(encoding="utf-8") as source:
            rows = list(csv.DictReader(source, delimiter="\t"))
        return [
            PhonemeCard(
                id=row["id"],
                symbol=row["symbol"],
                us=row["us"],
                group=row["group"],
                example=row["example"],
                contrast=row["contrast"],
                arpabet=row["pattern"],
                tip=row["tip"],
                note=row["note"],
                viseme_group=self._visemes.group_of(_first_phone(row["pattern"])),
                viseme_confidence=self._confidence(_first_phone(row["pattern"])),
            )
            for row in rows
        ]

    def _confidence(self, symbol: str) -> str | None:
        group = self._visemes.group_of(symbol)
        return self._visemes.target(group).confidence if group else None

    def drills(self) -> list[SoundDrillSummary]:
        """One row per chart sound, in chart order."""
        return [
            SoundDrillSummary(
                id=str(d["id"]),
                symbol=str(d["symbol"]),
                us=str(d["us"]),
                arpabet=str(d["arpabet"]),
                group=str(d["group"]),
                viseme_group=self._visemes.group_of(_first_phone(str(d["arpabet"]))),
                viseme_confidence=self._confidence(_first_phone(str(d["arpabet"]))),
                scorer_reliability=self._reliability.get(str(d["id"]), "unknown"),
                word_count=len(d["words"]),  # type: ignore[arg-type]
                pair_count=len(d["pairs"]),  # type: ignore[arg-type]
                sentence_count=len(d["sentences"]),  # type: ignore[arg-type]
                example=_first_word(d["words"]),  # type: ignore[arg-type]
            )
            for d in self._drills.values()
        ]

    def chart_phones(self) -> list[str]:
        """Target phones of the 44 chart sounds in chart order, without repeats."""
        seen: set[str] = set()
        phones: list[str] = []
        for item in self._drills.values():
            phone = _first_phone(str(item["arpabet"]))
            if phone not in seen:
                seen.add(phone)
                phones.append(phone)
        return phones

    def drill_id_of(self, phone: str) -> str | None:
        """Id of the first drill whose target is `phone` (None for phones outside the chart)."""
        for item in self._drills.values():
            if _first_phone(str(item["arpabet"])) == phone:
                return str(item["id"])
        return None

    def drill(self, sound_id: str) -> SoundDrill:
        """Full material for one sound."""
        item = self._drills.get(sound_id)
        if item is None:
            raise NotFoundError(f"sound {sound_id} not found")
        symbol = _first_phone(str(item["arpabet"]))
        return SoundDrill(
            id=str(item["id"]),
            symbol=str(item["symbol"]),
            us=str(item["us"]),
            arpabet=str(item["arpabet"]),
            group=str(item["group"]),
            viseme_group=self._visemes.group_of(symbol),
            viseme_confidence=self._confidence(symbol),
            scorer_reliability=self._reliability.get(str(item["id"]), "unknown"),
            transition_vi=self._visemes.transition_of(symbol),
            words=item["words"],
            pairs=item["pairs"],
            sentences=item["sentences"],
        )

    def phonemes(self) -> list[PhonemeCard]:
        """The 44-entry chart with American mappings."""
        return list(self._phonemes)

    def pairs(self) -> list[MinimalPair]:
        """Minimal pairs targeted at Vietnamese learners' errors."""
        return list(self._pairs)

    def sentences(self) -> list[Sentence]:
        """Practice sentences (statements, yes/no and wh- questions)."""
        return list(self._sentences)

    def errors(self) -> list[KnownErrorCard]:
        """The error catalogue with its current enablement."""
        return [
            KnownErrorCard(
                id=e.id,
                expected=e.expected,
                heard=list(e.heard),
                kind=e.kind.value,
                priority=e.priority,
                final_only=e.final_only,
                viseme_group=e.viseme_group,
                hint_vi=e.hint_vi,
                mouth_tip_vi=e.mouth_tip_vi,
                enabled=self._catalog.is_enabled(e),
            )
            for e in self._catalog.all
        ]

    def visemes(self) -> VisemeContent:
        """Targets, feature names and calibration steps for the mirror."""
        raw = json.loads((self._dir / "visemes.json").read_text(encoding="utf-8"))
        groups = [
            VisemeTargetCard(
                group=target.group,
                name_vi=target.name_vi,
                sounds=list(target.sounds),
                targets={
                    name: {k: v for k, v in (("min", low), ("max", high)) if v is not None}
                    for name, (low, high) in target.targets.items()
                },
                hold_ms=target.hold_ms,
                hint_vi=target.hint_vi,
                common_error_vi=target.common_error_vi,
                confidence=target.confidence,
            )
            for target in (self._visemes.target(g) for g in self._visemes.groups)
        ]
        steps = [CalibrationStep(**step) for step in raw["calibration"]["steps"]]
        return VisemeContent(
            features=list(self._visemes.feature_names),
            groups=groups,
            calibration=steps,
            transitions={k: v["transition_vi"] for k, v in raw.get("sounds_extra", {}).items()},
            confidence_labels=dict(raw.get("confidence_vi", {})),
        )


def _first_phone(pattern: str) -> str:
    """`AH1,AH2` → AH; `IH R` → IH (the chart maps r-coloured vowels to their vowel)."""
    first = pattern.split(",", maxsplit=1)[0].split(maxsplit=1)[0]
    return first.rstrip("012")


def _first_word(words: list[dict[str, object]]) -> str:
    """The drill's first word (`see` for the IY drill); empty for a drill without words."""
    return str(words[0]["word"]) if words else ""
