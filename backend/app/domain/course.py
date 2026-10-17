"""Course rules: which runs count for an item and which day is next (pure)."""

from collections.abc import Mapping
from dataclasses import dataclass

RUN_PREFIX = {"sound": "sound:{id}:", "pair": "pair:{id}:", "sentence": "sentence:{id}"}


@dataclass(frozen=True, slots=True)
class CourseItem:
    """A reference to content practised on a day."""

    kind: str
    id: str


def runs_for_item(item: CourseItem, item_counts: Mapping[str, int]) -> int:
    """Scored runs whose item id belongs to this content (prefix match on the stored item id)."""
    prefix = RUN_PREFIX[item.kind].format(id=item.id)
    if item.kind == "sentence":
        return item_counts.get(prefix, 0)
    return sum(count for stored, count in item_counts.items() if stored.startswith(prefix))


def next_day(done_flags: list[bool]) -> int:
    """Index of the first unfinished day; the last day when everything is done."""
    for index, done in enumerate(done_flags):
        if not done:
            return index
    return max(len(done_flags) - 1, 0)
