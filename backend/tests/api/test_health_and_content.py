from fastapi.testclient import TestClient


def test_health_reports_model_and_tts(client: TestClient) -> None:
    body = client.get("/api/v1/health").json()
    assert body["status"] == "ok"
    assert body["model_ready"] is True
    assert body["realtime_enabled"] is True


def test_content_endpoints_return_authored_items(client: TestClient) -> None:
    phonemes = client.get("/api/v1/content/phonemes").json()
    assert len(phonemes) == 44
    assert phonemes[0]["arpabet"] == "IY"
    assert phonemes[0]["viseme_group"] == "V6"
    pairs = client.get("/api/v1/content/pairs").json()
    assert {"think", "sink"} <= {w for p in pairs for w in p["words"]}
    sentences = client.get("/api/v1/content/sentences").json()
    assert any(s["kind"] == "question" for s in sentences)
    errors = client.get("/api/v1/content/errors").json()
    assert all(e["enabled"] is False for e in errors)  # no enabled list in a fresh content dir
    visemes = client.get("/api/v1/content/visemes").json()
    assert visemes["features"][0] == "aperture"
    assert len(visemes["groups"]) == 12
    assert visemes["transitions"]["AY"]
    assert visemes["confidence_labels"]["low"]
    assert len(visemes["calibration"]) == 6
    assert visemes["features"][-1] == "tongueVisible"


def test_unknown_route_under_api_is_json_404(client: TestClient) -> None:
    assert client.get("/api/v1/nope").status_code == 404


def test_every_sound_has_a_drill_and_a_tracked_viseme_group(client: TestClient) -> None:
    summaries = client.get("/api/v1/content/sounds").json()
    assert len(summaries) == 44
    assert all(s["viseme_group"] is not None for s in summaries)
    assert all(s["word_count"] >= 6 and s["sentence_count"] >= 2 for s in summaries)
    # Every card shows an example word under the symbol, as the 44-sound chart does.
    assert all(s["example"] for s in summaries)
    assert next(s for s in summaries if s["arpabet"] == "IY")["example"] == "see"
    drill = client.get("/api/v1/content/sounds/c09").json()
    assert drill["symbol"] == "θ"
    assert drill["viseme_group"] == "V3"
    assert {"word": "think", "position": "initial"} in drill["words"]
    assert ["think", "sink"] in drill["pairs"]
    assert client.get("/api/v1/content/sounds/zzz").status_code == 404
    diphthong = client.get("/api/v1/content/sounds/d02").json()
    assert "kết thúc" in diphthong["transition_vi"]
