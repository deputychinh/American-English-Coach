"""The course validates its content and tracks a profile's progress by stored item ids."""

import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.config.settings import Settings
from app.domain.course import CourseItem, next_day, runs_for_item
from app.main import create_app
from tests.api.test_assess import post
from tests.fakes import FakeRecognizer

COURSE = Path(__file__).resolve().parents[3] / "content" / "course.json"


def test_course_content_is_fourteen_short_days() -> None:
    days = json.loads(COURSE.read_text(encoding="utf-8"))
    assert len(days) == 14
    assert [d["id"] for d in days] == [f"day{n:02d}" for n in range(1, 15)]
    assert all(10 <= d["minutes"] <= 15 for d in days)
    assert all(3 <= len(d["items"]) <= 7 for d in days)
    kinds = {i["kind"] for d in days for i in d["items"]}
    assert kinds == {"sound", "pair", "sentence"}


def test_runs_for_item_matches_stored_item_ids_by_prefix() -> None:
    counts = {
        "sound:c09:word:think": 2,
        "sound:c09:pair:think-sink:0": 1,
        "pair:think-sink:1": 3,
        "sentence:s1": 1,
    }
    assert runs_for_item(CourseItem("sound", "c09"), counts) == 3
    assert runs_for_item(CourseItem("pair", "think-sink"), counts) == 3
    assert runs_for_item(CourseItem("sentence", "s1"), counts) == 1
    assert runs_for_item(CourseItem("sentence", "s10"), counts) == 0
    assert next_day([True, False, False]) == 1
    assert next_day([True, True]) == 1
    assert next_day([]) == 0


def test_course_progress_follows_the_profile_runs(client: TestClient) -> None:
    fresh = client.get("/api/v1/course").json()
    assert fresh["total_days"] == 14
    assert fresh["current_day"] == "day01"
    assert fresh["completed_days"] == 0
    assert fresh["days"][3]["items"][1]["label"] == "/θ/ và /s/"

    post(client, "think")  # item pair:think-sink:0
    after = client.get("/api/v1/course").json()
    day04 = after["days"][3]
    pair = next(i for i in day04["items"] if i["id"] == "think-sink")
    assert (pair["runs"], pair["done"]) == (1, True)
    assert day04["done_items"] == 1
    assert day04["is_done"] is False
    other = client.post("/api/v1/profiles", json={"name": "Minh"}).json()
    scoped = client.get("/api/v1/course", headers={"X-Coach-Profile": other["id"]}).json()
    assert scoped["days"][3]["done_items"] == 0


def test_course_with_an_unknown_reference_fails_fast(tmp_path: Path, settings: Settings) -> None:
    content = tmp_path / "content"
    content.mkdir()
    for path in settings.content_dir.iterdir():
        if path.is_file():
            (content / path.name).write_bytes(path.read_bytes())
    (content / "course.json").write_text(
        json.dumps(
            [
                {
                    "id": "day01",
                    "title_vi": "x",
                    "title_en": "x",
                    "goal_vi": "x",
                    "minutes": 10,
                    "items": [{"kind": "sound", "id": "zz"}],
                }
            ]
        ),
        encoding="utf-8",
    )
    broken = settings.model_copy(update={"content_dir": content})
    with (
        TestClient(create_app(broken, FakeRecognizer(["θ", "ɪ", "ŋ", "k"]))) as test_client,
        pytest.raises(ValueError, match="unknown sound zz"),
    ):
        test_client.get("/api/v1/course")
