"""Background warm-up: one silent inference at start, never fatal."""

import numpy as np
import pytest
from numpy.typing import NDArray

from app.config.settings import Settings
from app.container import AppContainer
from tests.fakes import FakeRecognizer


class BrokenRecognizer(FakeRecognizer):
    def __init__(self) -> None:
        super().__init__(["θ"])

    def log_posteriors(self, waveform: NDArray[np.float32]) -> NDArray[np.float32]:
        raise RuntimeError("device lost")


def test_warm_up_runs_one_inference(settings: Settings) -> None:
    recognizer = FakeRecognizer(["θ"])
    AppContainer(settings, recognizer).warm_up()
    assert recognizer.calls == 1


def test_warm_up_can_be_turned_off(settings: Settings) -> None:
    recognizer = FakeRecognizer(["θ"])
    AppContainer(settings.model_copy(update={"warm_up": False}), recognizer).warm_up()
    assert recognizer.calls == 0


def test_warm_up_failure_is_logged_not_raised(
    settings: Settings, caplog: pytest.LogCaptureFixture
) -> None:
    AppContainer(settings, BrokenRecognizer()).warm_up()
    assert "warm-up failed" in caplog.text
