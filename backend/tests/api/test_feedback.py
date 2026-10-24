"""POST /api/v1/tutor/feedback: text in, structured content feedback out (plan v2 V6)."""

import json

from fastapi.testclient import TestClient

from app.config.settings import Settings
from app.main import create_app
from tests.api.test_tutor import fake_llm
from tests.fakes import FakeRecognizer

ANSWER = json.dumps(
    {
        "grammar": [
            {"wrong": "work", "right": "works", "explain_vi": "Ngôi ba số ít cần -s."},
            {"wrong": "work", "right": "works", "explain_vi": "Bạn phát âm thiếu /s/."},
        ],
        "word_choice": [],
        "register": "neutral",
        "register_note_vi": None,
        "better_version": "My mother works at a hospital.",
    }
)


def test_feedback_is_off_without_a_provider(client: TestClient) -> None:
    response = client.post("/api/v1/tutor/feedback", json={"transcript": "Hello."})
    assert response.status_code == 503
    assert response.json()["code"] == "TUTOR_UNAVAILABLE"


def test_feedback_sends_text_only_and_drops_pronunciation(settings: Settings) -> None:
    llm, seen = fake_llm(f"```json\n{ANSWER}\n```")
    app = create_app(settings, FakeRecognizer([]), llm)
    with TestClient(app) as test_client:
        reply = test_client.post(
            "/api/v1/tutor/feedback",
            json={"transcript": "My mother work at a hospital.", "task_vi": "Kể về gia đình"},
        )
    assert reply.status_code == 200, reply.text
    body = reply.json()
    assert [item["right"] for item in body["grammar"]] == ["works"]
    assert body["focus"]["wrong"] == "work"
    assert body["formality"] == "neutral"
    assert body["better_version"] == "My mother works at a hospital."
    messages = seen[0]["messages"]
    assert isinstance(messages, list)
    assert "NEVER comment on pronunciation" in messages[0]["content"]
    assert (
        messages[1]["content"]
        == "Task: Kể về gia đình\nLearner said: My mother work at a hospital."
    )


def test_feedback_validates_the_transcript_and_reports_broken_answers(settings: Settings) -> None:
    llm, _ = fake_llm("Looks good to me!")
    app = create_app(settings, FakeRecognizer([]), llm)
    with TestClient(app) as test_client:
        assert (
            test_client.post("/api/v1/tutor/feedback", json={"transcript": ""}).status_code == 400
        )
        too_long = {"transcript": "word " * 200}
        assert test_client.post("/api/v1/tutor/feedback", json=too_long).status_code == 400
        broken = test_client.post("/api/v1/tutor/feedback", json={"transcript": "Hello."})
    assert broken.status_code == 503
