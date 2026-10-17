"""The 14-day course for Vietnamese learners and a profile's progress through it."""

from typing import Literal

from pydantic import BaseModel

CourseItemKind = Literal["sound", "pair", "sentence"]


class CourseItemRef(BaseModel):
    """A content reference as written in `content/course.json`."""

    kind: CourseItemKind
    id: str


class CourseDayFile(BaseModel):
    """One day as authored in `content/course.json`."""

    id: str
    title_vi: str
    title_en: str
    goal_vi: str
    minutes: int
    items: list[CourseItemRef]


class CourseItemModel(BaseModel):
    """One practice item of a day with the learner's run count."""

    kind: CourseItemKind
    id: str
    label: str
    runs: int
    done: bool


class CourseDayModel(BaseModel):
    """One day of the course."""

    id: str
    index: int
    title_vi: str
    title_en: str
    goal_vi: str
    minutes: int
    items: list[CourseItemModel]
    done_items: int
    total_items: int
    is_done: bool


class CourseResponse(BaseModel):
    """All days plus which one to do next."""

    days: list[CourseDayModel]
    current_day: str
    completed_days: int
    total_days: int
