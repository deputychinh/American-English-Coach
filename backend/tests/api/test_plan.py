"""`GET /plan` turns stored runs into today's focus, the week strip and a streak."""

from fastapi.testclient import TestClient

from tests.api.test_assess import post

VIETNAM = 7 * 60


def test_plan_for_a_fresh_profile_proposes_new_sounds(client: TestClient) -> None:
    body = client.get("/api/v1/plan", params={"tz_offset": VIETNAM, "goal": 2}).json()
    assert body["goal_runs"] == 2
    assert body["runs_today"] == 0
    assert body["streak_days"] == 0
    assert len(body["week"]) == 7
    assert body["week"][-1]["date"] == body["today"]
    assert [f["reason"] for f in body["focus"]] == ["new", "new", "new"]
    assert all(f["sound_id"] for f in body["focus"])
    assert body["practised_sounds"] == 0
    assert body["total_sounds"] >= 39


def test_plan_counts_today_and_the_streak_per_profile(client: TestClient) -> None:
    post(client, "think")
    post(client, "think")
    body = client.get("/api/v1/plan", params={"tz_offset": VIETNAM, "goal": 2}).json()
    assert body["runs_today"] == 2
    assert body["streak_days"] == 1
    assert body["week"][-1]["goal_met"] is True
    assert body["week"][-1]["ok"] == 8
    assert body["practised_sounds"] == 4
    other = client.post("/api/v1/profiles", json={"name": "Minh"}).json()
    scoped = client.get("/api/v1/plan", headers={"X-Coach-Profile": other["id"]}).json()
    assert scoped["runs_today"] == 0
    assert scoped["streak_days"] == 0


def test_plan_rejects_impossible_offsets(client: TestClient) -> None:
    assert client.get("/api/v1/plan", params={"tz_offset": 2000}).status_code == 400
