"""Phones on the network must pair; the local machine never needs a token."""

from fastapi.testclient import TestClient

from app.config.settings import Settings
from app.main import create_app
from app.security import is_loopback, new_pairing_code
from tests.fakes import FakeRecognizer


def network_client(settings: Settings) -> TestClient:
    paired = settings.model_copy(update={"pairing_code": "123456", "host": "0.0.0.0"})  # noqa: S104
    app = create_app(paired, FakeRecognizer(["θ", "ɪ", "ŋ", "k"]))
    return TestClient(app, client=("192.168.1.20", 50000))


def test_pairing_code_shape_and_loopback_detection() -> None:
    assert len(new_pairing_code()) == 6
    assert is_loopback("127.0.0.1")
    assert is_loopback("::1")
    assert is_loopback(None)
    assert is_loopback("testclient")
    assert not is_loopback("192.168.1.20")


def test_network_client_needs_a_token_but_probes_stay_open(settings: Settings) -> None:
    with network_client(settings) as client:
        assert client.get("/api/v1/health").status_code == 200
        assert client.get("/api/v1/ready").status_code == 200
        denied = client.get("/api/v1/content/phonemes")
        assert denied.status_code == 401
        assert denied.json()["code"] == "UNAUTHORIZED"
        wrong = client.post("/api/v1/pair", json={"code": "000000", "device_name": "iPhone"})
        assert wrong.status_code == 401
        ok = client.post("/api/v1/pair", json={"code": "123456", "device_name": "iPhone của Chinh"})
        assert ok.status_code == 200, ok.text
        token = ok.json()["token"]
        allowed = client.get("/api/v1/content/phonemes", headers={"X-Coach-Token": token})
        assert allowed.status_code == 200
        bad = client.get("/api/v1/content/phonemes", headers={"X-Coach-Token": "nope"})
        assert bad.status_code == 401


def test_loopback_client_is_never_asked_for_a_token(client: TestClient) -> None:
    assert client.get("/api/v1/content/phonemes").status_code == 200
