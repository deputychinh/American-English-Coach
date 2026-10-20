import json
from pathlib import Path

from fastapi.testclient import TestClient
from httpx2 import Response

from app.config.settings import Settings
from app.main import create_app
from tests.conftest import wav_bytes
from tests.fakes import FakeRecognizer


def post(
    client: TestClient, text: str, headers_profile: str | None = None, **fields: str
) -> Response:
    data = {"text": text, "item_id": "pair:think-sink:0", "kind": "word", **fields}
    files = {"audio": ("rec.wav", wav_bytes(), "audio/wav")}
    headers = {"X-Coach-Profile": headers_profile} if headers_profile else {}
    return client.post("/api/v1/assess", data=data, files=files, headers=headers)


def test_correct_think_is_all_ok_and_is_stored(client: TestClient) -> None:
    response = post(client, "think")
    assert response.status_code == 200, response.text
    body = response.json()
    assert [p["verdict"] for p in body["words"][0]["phones"]] == ["ok", "ok", "ok", "ok"]
    assert body["words"][0]["ipa"] == "θɪŋk"
    assert body["summary"] == {"ok": 4, "check": 0, "error": 0, "focus": [], "camera_used": False}
    assert body["model_version"] == "fake@test"
    stored = client.get(f"/api/v1/runs/{body['id']}").json()
    assert stored["id"] == body["id"]
    progress = client.get("/api/v1/progress").json()
    assert progress["runs"] == 1
    assert {p["phoneme"]: p["ok"] for p in progress["phonemes"]}["TH"] == 1


def test_th_said_as_t_is_check_when_the_error_is_not_enabled(settings: Settings) -> None:
    with TestClient(create_app(settings, FakeRecognizer(["t", "ɪ", "ŋ", "k"]))) as client:
        body = post(client, "think").json()
    th = body["words"][0]["phones"][0]
    assert th["verdict"] == "check"
    assert th["heard"] == "T"
    assert th["error_id"] == "th_to_t_s_f"
    assert "lưỡi" in th["hint_vi"]
    assert body["summary"]["focus"][0]["error_id"] == "th_to_t_s_f"


def test_th_said_as_t_is_error_once_precision_gate_enables_it(
    tmp_path: Path, settings: Settings
) -> None:
    content = tmp_path / "content"
    content.mkdir()
    for name in (
        "vn_errors.json",
        "visemes.json",
        "minimal_pairs.json",
        "sentences.json",
        "phonemes.tsv",
    ):
        (content / name).write_bytes((settings.content_dir / name).read_bytes())
    (content / "enabled_errors.json").write_text('["th_to_t_s_f"]', encoding="utf-8")
    gated = settings.model_copy(update={"content_dir": content})
    with TestClient(create_app(gated, FakeRecognizer(["t", "ɪ", "ŋ", "k"]))) as client:
        body = post(client, "think").json()
    assert body["words"][0]["phones"][0]["verdict"] == "error"
    assert body["summary"]["error"] == 1


def test_dropped_final_p_is_a_deletion_with_final_only_hint(settings: Settings) -> None:
    with TestClient(create_app(settings, FakeRecognizer(["s", "t", "ɑː"]))) as client:
        body = post(client, "stop").json()
    final = body["words"][0]["phones"][-1]
    assert final["symbol"] == "P"
    assert final["heard"] == ""
    assert final["error_id"] == "final_p_dropped"
    assert final["viseme_group"] == "V1"


def test_a_vowel_after_the_final_consonant_is_flagged_as_epenthesis(settings: Settings) -> None:
    with TestClient(create_app(settings, FakeRecognizer(["θ", "ɪ", "ŋ", "k", "ə"]))) as client:
        body = post(client, "think").json()
    final = body["words"][0]["phones"][-1]
    assert final["symbol"] == "K"
    assert final["verdict"] == "check"
    assert final["error_id"] == "final_epenthesis"
    assert "ơ" in final["hint_vi"]
    assert [p["verdict"] for p in body["words"][0]["phones"][:3]] == ["ok", "ok", "ok"]


def test_a_vowel_inside_the_word_is_not_epenthesis(settings: Settings) -> None:
    with TestClient(create_app(settings, FakeRecognizer(["θ", "ɪ", "ə", "ŋ", "k"]))) as client:
        body = post(client, "think").json()
    assert all(p["error_id"] != "final_epenthesis" for p in body["words"][0]["phones"])


def test_mouth_frames_raise_check_to_error_when_lips_are_off(settings: Settings) -> None:
    flat = {
        "aperture": 0.3,
        "width": 0.8,
        "roundness": 0.1,
        "jaw": 0.2,
        "lipClosed": 0.0,
        "lowerLipTuck": 0.0,
    }
    frames = [{"t": 100.0 + i * 0.03, "features": flat, "quality": 1.0} for i in range(40)]
    with TestClient(create_app(settings, FakeRecognizer(["ʃ", "iː"]))) as client:
        wrong = post(
            client, "she", kind="word", mouth_frames=json.dumps(frames), audio_started_at="100.0"
        ).json()
    sh = wrong["words"][0]["phones"][0]
    assert sh["visual"] == "off"
    assert sh["audio_verdict"] == "ok"
    assert sh["verdict"] == "ok"
    assert sh["show_mouth_hint"] is True
    assert sh["mouth_tip_vi"]
    assert wrong["summary"]["camera_used"] is True


def test_variant_selection_picks_the_pronunciation_the_learner_used(settings: Settings) -> None:
    # reCORD (verb): r ɪ k ɔː ɹ d
    with TestClient(
        create_app(settings, FakeRecognizer(["ɹ", "ɪ", "k", "ɔː", "ɹ", "d"]))
    ) as client:
        body = post(client, "record").json()
    assert body["words"][0]["phones"][1]["symbol"] == "IH"
    assert body["summary"]["error"] == 0


def test_bad_inputs_are_problem_details(client: TestClient) -> None:
    files = {"audio": ("rec.wav", b"not a wav", "audio/wav")}
    bad_audio = client.post("/api/v1/assess", data={"text": "think", "item_id": "x"}, files=files)
    assert bad_audio.status_code == 422
    assert bad_audio.json()["code"] == "AUDIO_INVALID"
    unknown = post(client, "think xqzvv")
    assert unknown.status_code == 422
    assert unknown.json()["code"] == "WORD_UNKNOWN"
    silent = client.post(
        "/api/v1/assess",
        data={"text": "think", "item_id": "x"},
        files={"audio": ("rec.wav", wav_bytes(silent=True), "audio/wav")},
    )
    assert silent.json()["code"] == "AUDIO_INVALID"
    assert post(client, "think", kind="song").status_code == 400
    assert post(client, "think", mouth_frames="{bad").status_code == 400
    missing = client.post("/api/v1/assess", data={"item_id": "x"})
    assert missing.status_code == 400
    assert missing.headers["content-type"].startswith("application/problem+json")


def test_disabled_realtime_returns_503(settings: Settings, recognizer: FakeRecognizer) -> None:
    off = settings.model_copy(update={"realtime_enabled": False})
    with TestClient(create_app(off, recognizer)) as client:
        assert post(client, "think").status_code == 503


def test_dispute_and_missing_run(client: TestClient) -> None:
    run_id = post(client, "think").json()["id"]
    assert client.post(f"/api/v1/runs/{run_id}/dispute").status_code == 204
    assert client.get("/api/v1/progress").json()["recent"][0]["disputed"] is True
    assert client.get("/api/v1/runs/nope").status_code == 404
    assert client.post("/api/v1/runs/nope/dispute").json()["code"] == "NOT_FOUND"


def test_calibration_round_trip(client: TestClient) -> None:
    assert client.get("/api/v1/calibration").json() is None
    payload = {"features": {"aperture": {"min": 0.01, "max": 0.3}}}
    assert client.put("/api/v1/calibration", json=payload).status_code == 204
    assert client.get("/api/v1/calibration").json() == payload
    assert client.put("/api/v1/calibration", json=payload).status_code == 204
