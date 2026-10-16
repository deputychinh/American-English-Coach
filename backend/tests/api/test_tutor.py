import json

import httpx
from fastapi.testclient import TestClient

from app.config.settings import Settings
from app.main import create_app
from app.ml.llm_client import ChatClient
from tests.api.test_assess import post
from tests.fakes import FakeRecognizer

JPEG = b"\xff\xd8\xff\xe0" + b"\x00" * 64


def fake_llm(answer: str, status: int = 200) -> tuple[ChatClient, list[dict[str, object]]]:
    seen: list[dict[str, object]] = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(json.loads(request.content))
        if status != 200:
            return httpx.Response(status, json={"error": {"message": "nope"}})
        return httpx.Response(200, json={"choices": [{"message": {"content": answer}}]})

    client = ChatClient("https://llm.test/v1", "k", 5, transport=httpx.MockTransport(handler))
    return client, seen


def test_tutor_is_off_without_a_provider(client: TestClient) -> None:
    assert client.get("/api/v1/health").json()["tutor_available"] is False
    response = client.post("/api/v1/tutor/explain", json={"run_id": "x"})
    assert response.status_code == 503
    assert response.json()["code"] == "TUTOR_UNAVAILABLE"


def test_explain_sends_only_flagged_phones_and_returns_vietnamese(settings: Settings) -> None:
    llm, seen = fake_llm("Bạn phát âm tốt; âm /θ/ có thể đang thành /t/.")
    app = create_app(settings, FakeRecognizer(["t", "ɪ", "ŋ", "k"]), llm)
    with TestClient(app) as test_client:
        run_id = post(test_client, "think").json()["id"]
        reply = test_client.post("/api/v1/tutor/explain", json={"run_id": run_id})
        assert reply.status_code == 200, reply.text
        assert "θ" in reply.json()["text_vi"]
        assert test_client.post("/api/v1/tutor/explain", json={"run_id": "nope"}).status_code == 404
    payload = json.loads(str(seen[0]["messages"][1]["content"]))  # type: ignore[index]
    assert payload["text"] == "think"
    assert [f["phone"] for f in payload["flagged"]] == ["θ"]
    assert seen[0]["temperature"] == 1


def test_mouth_photo_is_forwarded_as_a_data_url_and_validated(settings: Settings) -> None:
    llm, seen = fake_llm("Môi hơi tròn, chưa thấy đầu lưỡi.")
    app = create_app(settings, FakeRecognizer(["θ"]), llm)
    with TestClient(app) as test_client:
        ok = test_client.post(
            "/api/v1/tutor/mouth",
            data={"sound_ipa": "θ", "target_vi": "Đầu lưỡi giữa hai hàm răng"},
            files={"image": ("m.jpg", JPEG, "image/jpeg")},
        )
        assert ok.status_code == 200, ok.text
        bad = test_client.post(
            "/api/v1/tutor/mouth",
            data={"sound_ipa": "θ", "target_vi": "x"},
            files={"image": ("m.png", b"\x89PNG....", "image/png")},
        )
        assert bad.status_code == 400
    content = seen[0]["messages"][1]["content"]  # type: ignore[index]
    assert content[1]["image_url"]["url"].startswith("data:image/jpeg;base64,")


def test_provider_errors_become_503(settings: Settings) -> None:
    llm, _ = fake_llm("", status=500)
    app = create_app(settings, FakeRecognizer(["θ", "ɪ", "ŋ", "k"]), llm)
    with TestClient(app) as test_client:
        run_id = post(test_client, "think").json()["id"]
        reply = test_client.post("/api/v1/tutor/explain", json={"run_id": run_id})
        assert reply.status_code == 503
        assert reply.json()["code"] == "TUTOR_UNAVAILABLE"


def test_empty_answer_is_retried_once_with_a_nudge(settings: Settings) -> None:
    answers = iter(["", "Câu trả lời sau khi nhắc."])
    seen: list[dict[str, object]] = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(json.loads(request.content))
        return httpx.Response(200, json={"choices": [{"message": {"content": next(answers)}}]})

    llm = ChatClient("https://llm.test/v1", "k", 5, transport=httpx.MockTransport(handler))
    app = create_app(settings, FakeRecognizer(["θ", "ɪ", "ŋ", "k"]), llm)
    with TestClient(app) as test_client:
        run_id = post(test_client, "think").json()["id"]
        reply = test_client.post("/api/v1/tutor/explain", json={"run_id": run_id})
    assert reply.json()["text_vi"] == "Câu trả lời sau khi nhắc."
    assert len(seen) == 2
    assert "in thẳng" in str(seen[1]["messages"][-1]["content"])  # type: ignore[index]


def test_two_empty_answers_are_an_error(settings: Settings) -> None:
    llm, _ = fake_llm("   ")
    app = create_app(settings, FakeRecognizer(["θ", "ɪ", "ŋ", "k"]), llm)
    with TestClient(app) as test_client:
        run_id = post(test_client, "think").json()["id"]
        assert test_client.post("/api/v1/tutor/explain", json={"run_id": run_id}).status_code == 503
