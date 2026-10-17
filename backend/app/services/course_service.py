"""Builds the course view of a profile from content and stored runs."""

from pathlib import Path

from pydantic import TypeAdapter

from app.domain.course import CourseItem, next_day, runs_for_item
from app.repositories.results_repository import ResultsRepository
from app.schemas.course import (
    CourseDayFile,
    CourseDayModel,
    CourseItemModel,
    CourseItemRef,
    CourseResponse,
)
from app.services.content_service import ContentService

COURSE_FILE = "course.json"
COURSE_DAYS = TypeAdapter(list[CourseDayFile])


class CourseService:
    """Loads `content/course.json` once and validates every reference against the content."""

    def __init__(
        self, content_dir: Path, content: ContentService, results: ResultsRepository
    ) -> None:
        self._content = content
        self._results = results
        self._days = COURSE_DAYS.validate_json((content_dir / COURSE_FILE).read_bytes())
        self._labels = self._build_labels()
        for day in self._days:
            for item in day.items:
                if (item.kind, item.id) not in self._labels:
                    raise ValueError(f"course references unknown {item.kind} {item.id}")

    def _build_labels(self) -> dict[tuple[str, str], str]:
        labels: dict[tuple[str, str], str] = {}
        for drill in self._content.drills():
            labels[("sound", drill.id)] = f"/{drill.us}/"
        for pair in self._content.pairs():
            labels[("pair", pair.id)] = pair.title_vi
        for sentence in self._content.sentences():
            labels[("sentence", sentence.id)] = sentence.text
        return labels

    def course(self, profile_id: str) -> CourseResponse:
        """Every day with per-item run counts for the profile."""
        counts = self._results.item_counts(profile_id)
        days = [self._day(index, raw, counts) for index, raw in enumerate(self._days)]
        current = next_day([d.is_done for d in days])
        return CourseResponse(
            days=days,
            current_day=days[current].id if days else "",
            completed_days=sum(1 for d in days if d.is_done),
            total_days=len(days),
        )

    def _day(self, index: int, raw: CourseDayFile, counts: dict[str, int]) -> CourseDayModel:
        items = [self._item(ref, counts) for ref in raw.items]
        done_items = sum(1 for i in items if i.done)
        return CourseDayModel(
            id=raw.id,
            index=index + 1,
            title_vi=raw.title_vi,
            title_en=raw.title_en,
            goal_vi=raw.goal_vi,
            minutes=raw.minutes,
            items=items,
            done_items=done_items,
            total_items=len(items),
            is_done=done_items == len(items),
        )

    def _item(self, ref: CourseItemRef, counts: dict[str, int]) -> CourseItemModel:
        runs = runs_for_item(CourseItem(ref.kind, ref.id), counts)
        return CourseItemModel(
            kind=ref.kind,
            id=ref.id,
            label=self._labels[(ref.kind, ref.id)],
            runs=runs,
            done=runs > 0,
        )
