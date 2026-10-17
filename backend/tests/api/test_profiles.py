"""Learner profiles isolate progress and calibration; export/import moves them between coaches."""

from fastapi.testclient import TestClient

from tests.api.test_assess import post

HEADER = "X-Coach-Profile"


def test_default_profile_exists_and_new_profiles_isolate_progress(client: TestClient) -> None:
    profiles = client.get("/api/v1/profiles").json()
    assert [p["id"] for p in profiles] == ["default"]
    created = client.post("/api/v1/profiles", json={"name": "  Minh  "})
    assert created.status_code == 201, created.text
    minh = created.json()
    assert minh["name"] == "Minh"
    assert minh["runs"] == 0

    post(client, "think")
    assert post(client, "think", headers_profile=minh["id"]).status_code == 200
    default_progress = client.get("/api/v1/progress").json()
    minh_progress = client.get("/api/v1/progress", headers={HEADER: minh["id"]}).json()
    assert default_progress["runs"] == 1
    assert minh_progress["runs"] == 1
    assert (
        minh_progress["recent"][0]["created_at"].endswith("Z")
        or "+00:00" in (minh_progress["recent"][0]["created_at"])
    )
    listed = {p["id"]: p["runs"] for p in client.get("/api/v1/profiles").json()}
    assert listed == {"default": 1, minh["id"]: 1}


def test_unknown_profile_header_is_a_404_problem(client: TestClient) -> None:
    response = client.get("/api/v1/progress", headers={HEADER: "nope1234"})
    assert response.status_code == 404
    assert response.json()["code"] == "NOT_FOUND"
    # A blank header means the default profile.
    assert client.get("/api/v1/progress", headers={HEADER: "  "}).status_code == 200


def test_calibration_is_stored_per_profile(client: TestClient) -> None:
    minh = client.post("/api/v1/profiles", json={"name": "Minh"}).json()
    body = {"features": {"aperture": {"min": 0.1, "max": 0.9}}}
    assert (
        client.put("/api/v1/calibration", json=body, headers={HEADER: minh["id"]}).status_code
        == 204
    )
    assert client.get("/api/v1/calibration").json() is None
    assert client.get("/api/v1/calibration", headers={HEADER: minh["id"]}).json() == body


def test_rename_delete_and_the_default_profile_is_kept(client: TestClient) -> None:
    minh = client.post("/api/v1/profiles", json={"name": "Minh"}).json()
    renamed = client.patch(f"/api/v1/profiles/{minh['id']}", json={"name": "Minh Anh"})
    assert renamed.json()["name"] == "Minh Anh"
    run_id = post(client, "think", headers_profile=minh["id"]).json()["id"]
    client.put(
        "/api/v1/calibration",
        json={"features": {"aperture": {"min": 0, "max": 1}}},
        headers={HEADER: minh["id"]},
    )
    assert client.delete(f"/api/v1/profiles/{minh['id']}").status_code == 204
    assert client.get(f"/api/v1/runs/{run_id}").status_code == 404
    assert [p["id"] for p in client.get("/api/v1/profiles").json()] == ["default"]
    refused = client.delete("/api/v1/profiles/default")
    assert refused.status_code == 400
    assert client.delete("/api/v1/profiles/missing1").status_code == 404


def test_export_then_import_recreates_runs_and_calibration(client: TestClient) -> None:
    minh = client.post("/api/v1/profiles", json={"name": "Minh"}).json()
    post(client, "think", headers_profile=minh["id"])
    client.put(
        "/api/v1/calibration",
        json={"features": {"aperture": {"min": 0.2, "max": 0.8}}},
        headers={HEADER: minh["id"]},
    )
    snapshot = client.get(f"/api/v1/profiles/{minh['id']}/export").json()
    assert snapshot["format"] == "aec-profile/1"
    assert len(snapshot["runs"]) == 1
    assert len(snapshot["runs"][0]["phonemes"]) == 4

    first = client.post("/api/v1/profiles/import", json=snapshot)
    assert first.status_code == 201, first.text
    assert first.json()["imported_runs"] == 0  # same run ids already exist on this coach
    assert first.json()["skipped_runs"] == 1

    client.delete(f"/api/v1/profiles/{minh['id']}")
    client.delete(f"/api/v1/profiles/{first.json()['profile']['id']}")
    second = client.post("/api/v1/profiles/import?name=Minh%20(m%C3%A1y%20c%C5%A9)", json=snapshot)
    body = second.json()
    assert body["imported_runs"] == 1
    assert body["profile"]["name"] == "Minh (máy cũ)"
    assert body["profile"]["runs"] == 1
    restored = client.get("/api/v1/progress", headers={HEADER: body["profile"]["id"]}).json()
    assert restored["recent"][0]["id"] == snapshot["runs"][0]["id"]
    calibration = client.get("/api/v1/calibration", headers={HEADER: body["profile"]["id"]}).json()
    assert calibration == {"features": {"aperture": {"min": 0.2, "max": 0.8}}}
