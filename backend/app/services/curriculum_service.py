"""Loads the levelled curriculum once, validates every reference, reports a profile's progress."""

from dataclasses import dataclass
from pathlib import Path

from app.domain.course import CourseItem, next_day, runs_for_item
from app.repositories.results_repository import ResultsRepository
from app.schemas.course import CourseItemRef
from app.schemas.curriculum import (
    STEP_ORDER,
    ControlledStep,
    CurriculumFile,
    CurriculumResponse,
    DescribeStep,
    DiscriminateStep,
    GuidedStep,
    LevelModel,
    UnitFile,
    UnitModel,
    UnitProgressModel,
)
from app.services.content_service import ContentService

CURRICULUM_FILE = "curriculum.json"


@dataclass(frozen=True, slots=True)
class _Catalog:
    sounds: set[str]
    pairs: set[str]
    sentences: dict[str, str]

    def known(self, kind: str) -> set[str]:
        return {"sound": self.sounds, "pair": self.pairs, "sentence": set(self.sentences)}[kind]


class CurriculumService:
    """`content/curriculum.json` with cross-checks against sounds, pairs and sentences."""

    def __init__(
        self, content_dir: Path, content: ContentService, results: ResultsRepository
    ) -> None:
        self._results = results
        self._file = CurriculumFile.model_validate_json(
            (content_dir / CURRICULUM_FILE).read_bytes()
        )
        self._validate(content)

    def _validate(self, content: ContentService) -> None:
        catalog = _Catalog(
            sounds={drill.id for drill in content.drills()},
            pairs={pair.id for pair in content.pairs()},
            sentences={s.id: s.text.lower() for s in content.sentences()},
        )
        seen: set[str] = set()
        for level in self._file.levels:
            for unit in level.units:
                if unit.id in seen:
                    raise ValueError(f"curriculum unit {unit.id} appears twice")
                seen.add(unit.id)
                _check_unit(unit, catalog)

    def curriculum(self, profile_id: str) -> CurriculumResponse:
        """Every level and unit with the profile's controlled-step progress."""
        counts = self._results.item_counts(profile_id)
        levels: list[LevelModel] = []
        units: list[UnitModel] = []
        index = 0
        for level in self._file.levels:
            level_units = []
            for raw in level.units:
                index += 1
                unit = self._unit(raw, level.id, index, counts)
                level_units.append(unit)
                units.append(unit)
            levels.append(
                LevelModel(
                    id=level.id,
                    title_vi=level.title_vi,
                    title_en=level.title_en,
                    goal_vi=level.goal_vi,
                    units=level_units,
                    done_units=sum(1 for u in level_units if u.progress.is_done),
                )
            )
        current = next_day([u.progress.is_done for u in units])
        return CurriculumResponse(
            levels=levels,
            current_unit=units[current].id if units else "",
            completed_units=sum(1 for u in units if u.progress.is_done),
            total_units=len(units),
        )

    @staticmethod
    def _unit(raw: UnitFile, level: str, index: int, counts: dict[str, int]) -> UnitModel:
        refs: list[CourseItemRef] = next(
            step.items for step in raw.steps if isinstance(step, ControlledStep)
        )
        done_ids = [
            f"{ref.kind}:{ref.id}"
            for ref in refs
            if runs_for_item(CourseItem(ref.kind, ref.id), counts) > 0
        ]
        progress = UnitProgressModel(
            done_items=len(done_ids),
            total_items=len(refs),
            is_done=len(done_ids) == len(refs),
            done_ids=done_ids,
        )
        return UnitModel(**raw.model_dump(), level=level, index=index, progress=progress)


def _require(condition: bool, unit_id: str, what: str, value: str) -> None:
    if not condition:
        raise ValueError(f"curriculum unit {unit_id} references unknown {what} {value!r}")


def _check_ids(ids: list[str], known: set[str], unit_id: str, what: str) -> None:
    for value in ids:
        _require(value in known, unit_id, what, value)


def _check_discriminate(
    step: DiscriminateStep, unit_id: str, pairs: set[str], sentences: dict[str, str]
) -> None:
    _check_ids(step.pairs, pairs, unit_id, "pair")
    for item in step.stress:
        _require(item.stressed < len(item.syllables), unit_id, "stress", item.word)
    for focus in step.focus:
        text = sentences.get(focus.sentence)
        _require(text is not None, unit_id, "sentence", focus.sentence)
        _require(text is not None and focus.word.lower() in text, unit_id, "focus word", focus.word)


def _check_unit(unit: UnitFile, catalog: _Catalog) -> None:
    if tuple(step.kind for step in unit.steps) != STEP_ORDER:
        raise ValueError(f"curriculum unit {unit.id} steps must be {STEP_ORDER}")
    _check_ids(unit.focus_sounds, catalog.sounds, unit.id, "sound")
    for step in unit.steps:
        if isinstance(step, DescribeStep):
            _check_ids(step.sounds, catalog.sounds, unit.id, "sound")
        elif isinstance(step, DiscriminateStep):
            _check_discriminate(step, unit.id, catalog.pairs, catalog.sentences)
        elif isinstance(step, ControlledStep):
            for ref in step.items:
                _require(ref.id in catalog.known(ref.kind), unit.id, ref.kind, ref.id)
        elif isinstance(step, GuidedStep):
            _check_ids(step.sentences, set(catalog.sentences), unit.id, "sentence")
