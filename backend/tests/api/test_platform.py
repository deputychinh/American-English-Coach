"""Request ids, JSON logs, readiness, fake recogniser mode and tutor rate limit."""

import json
import logging

import httpx
from fastapi.testclient import TestClient

from app.config.settings import Settings
from app.logging_setup import JsonFormatter
from app.main import create_app
from app.ml.llm_client import ChatClient
from tests.api.test_assess import post
from tests.fakes import FakeRecognizer


def test_every_response_carries_a_request_id(client: TestClient) -> None:
    fresh = client.get("/api/v1/health")
    assert len(fresh.headers["x-request-id"]) >= 8
    echoed = client.get("/api/v1/health", headers={"X-Request-Id": "abc123"})
    assert echoed.headers["x-request-id"] == "abc123"


def test_json_formatter_includes_extras_and_never_breaks_on_objects() -> None:
    record = logging.LogRecord("coach", logging.INFO, "f.py", 1, "request", None, None)
    record.request_id = "r1"
    record.duration_ms = 3.2
    record.weird = object()
    payload = json.loads(JsonFormatter().format(record))
    assert payload["message"] == "request"
    assert payload["request_id"] == "r1"
    assert payload["duration_ms"] == 3.2
    assert "weird" in payload


def test_ready_reports_fake_recognizer_mode(settings: Settings) -> None:
    fake_mode = settings.model_copy(update={"recognizer": "fake"})
    with TestClient(create_app(fake_mode)) as test_client:
        ready = test_client.get("/api/v1/ready").json()
        assert ready["status"] == "ready"
        assert ready["recognizer"] == "fake"
        body = post(test_client, "think").json()
        assert body["model_version"] == "fake-recognizer@ci"
        assert [p["verdict"] for p in body["words"][0]["phones"]] == ["ok", "ok", "ok", "ok"]


def test_ready_is_503_without_model_files(settings: Settings) -> None:
    with TestClient(create_app(settings)) as test_client:
        response = test_client.get("/api/v1/ready")
        assert response.status_code == 503
        assert response.json()["code"] == "NOT_READY"


def test_tutor_is_rate_limited_per_client(settings: Settings) -> None:
    def handler(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"choices": [{"message": {"content": "ok"}}]})

    llm = ChatClient("https://llm.test/v1", "k", 5, transport=httpx.MockTransport(handler))
    limited = settings.model_copy(update={"tutor_rate_limit_per_minute": 2})
    with TestClient(create_app(limited, FakeRecognizer(["θ", "ɪ", "ŋ", "k"]), llm)) as test_client:
        run_id = post(test_client, "think").json()["id"]
        statuses = [
            test_client.post("/api/v1/tutor/explain", json={"run_id": run_id}).status_code
            for _ in range(3)
        ]
        assert statuses == [200, 200, 429]
        other = test_client.post(
            "/api/v1/tutor/explain", json={"run_id": run_id}, headers={"X-Coach-Token": "b"}
        )
        assert other.status_code == 200
