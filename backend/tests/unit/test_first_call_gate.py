"""The first librosa call is serialised so numba compiles once, then calls run freely."""

import threading
import time

import pytest

from app.ml.features import FirstCallGate


def test_first_calls_never_overlap() -> None:
    gate = FirstCallGate()
    active = 0
    peak = 0
    guard = threading.Lock()

    def slow() -> None:
        nonlocal active, peak
        with guard:
            active += 1
            peak = max(peak, active)
        time.sleep(0.05)
        with guard:
            active -= 1

    threads = [threading.Thread(target=lambda: gate.run(slow)) for _ in range(3)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()
    assert peak == 1


def test_a_failed_first_call_keeps_the_gate_closed() -> None:
    gate = FirstCallGate()

    def boom() -> int:
        raise RuntimeError("compile failed")

    with pytest.raises(RuntimeError):
        gate.run(boom)
    assert gate.run(lambda: 7) == 7
