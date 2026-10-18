"""The curriculum validates its content and reports progress per profile."""

import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.config.settings import Settings
from app.container import AppContainer
from app.schemas.curriculum import STEP_ORDER
from tests.api.test_assess import post

CURRICULUM = Path(__file__).resolve().parents[3] / "content" / "curriculum.json"


def test_curriculum_content_has_five_step_units() -> None:
    data = json.loads(CURRICULUM.read_text(encoding="utf-8"))
    units = [unit for level in data["levels"] for unit in level["units"]]
    assert len(units) >= 6
    assert len({unit["id"] for unit in units}) == len(units)
    for unit in units:
        assert tuple(step["kind"] for step in unit["steps"]) == STEP_ORDER
        assert 5 <= unit["minutes"] <= 20
        discriminate = unit["steps"][1]
        assert discriminate["pairs"] or discriminate["stress"] or discriminate["focus"]


def test_curriculum_progress_follows_the_profile_runs(client: TestClient) -> None:
    fresh = client.get("/api/v1/curriculum").json()
    assert fresh["total_units"] >= 6
    assert fresh["current_unit"] == "u01"
    assert fresh["completed_units"] == 0
    u03 = next(u for lvl in fresh["levels"] for u in lvl["units"] if u["id"] == "u03")
    assert u03["progress"] == {
        "done_items": 0,
        "total_items": 5,
        "is_done": False,
        "done_ids": [],
    }
    assert u03["steps"][1]["pairs"][0] == "think-sink"
    assert fresh["labels"]["sound:c09"] == "/θ/"
    assert fresh["labels"]["pair:think-sink"] == "think / sink"

    post(client, "think")  # item pair:think-sink:0
    after = client.get("/api/v1/curriculum").json()
    u03 = next(u for lvl in after["levels"] for u in lvl["units"] if u["id"] == "u03")
    assert u03["progress"]["done_items"] == 1
    assert u03["progress"]["done_ids"] == ["pair:think-sink"]
    other = client.post("/api/v1/profiles", json={"name": "Minh"}).json()
    scoped = client.get("/api/v1/curriculum", headers={"X-Coach-Profile": other["id"]}).json()
    u03 = next(u for lvl in scoped["levels"] for u in lvl["units"] if u["id"] == "u03")
    assert u03["progress"]["done_items"] == 0


def test_curriculum_rejects_unknown_references(tmp_path: Path) -> None:
    content_dir = Path(__file__).resolve().parents[3] / "content"
    broken = tmp_path / "content"
    broken.mkdir()
    for file in content_dir.iterdir():
        if file.is_file():
            (broken / file.name).write_bytes(file.read_bytes())
    data = json.loads((broken / "curriculum.json").read_text(encoding="utf-8"))
    data["levels"][0]["units"][0]["steps"][2]["items"][0]["id"] = "nope"
    (broken / "curriculum.json").write_text(json.dumps(data), encoding="utf-8")
    container = AppContainer(Settings(content_dir=broken, data_dir=tmp_path / "data"))
    with pytest.raises(ValueError, match="unknown sound 'nope'"):
        _ = container.curriculum
