import json
from pathlib import Path

import numpy as np
import onnx
import pytest
from onnx import TensorProto, helper, numpy_helper

from app.errors import ModelUnavailableError
from app.ml.onnx_recognizer import OnnxRecognizer, log_softmax, normalise

FRAME = 320  # 20 ms at 16 kHz
VOCAB = {"<pad>": 0, "a": 1, "b": 2}


def tiny_model(folder: Path) -> Path:
    """[1, N] audio → [1, N/320, 3] logits: reshape into frames, then a fixed MatMul."""
    weights = np.zeros((FRAME, len(VOCAB)), dtype=np.float32)
    weights[:, 1] = 1.0  # column "a" grows with the frame's summed (normalised) audio
    graph = helper.make_graph(
        [
            helper.make_node("Reshape", ["input_values", "shape"], ["frames"]),
            helper.make_node("MatMul", ["frames", "weights"], ["logits"]),
        ],
        "tiny",
        [helper.make_tensor_value_info("input_values", TensorProto.FLOAT, [1, None])],
        [helper.make_tensor_value_info("logits", TensorProto.FLOAT, [1, None, len(VOCAB)])],
        initializer=[
            numpy_helper.from_array(np.array([1, -1, FRAME], dtype=np.int64), "shape"),
            numpy_helper.from_array(weights, "weights"),
        ],
    )
    model = helper.make_model(graph, opset_imports=[helper.make_opsetid("", 17)])
    model.ir_version = 9
    path = folder / "tiny.onnx"
    onnx.save(model, path)
    (folder / "vocab.json").write_text(json.dumps(VOCAB), encoding="utf-8")
    return path


def test_runs_the_model_and_returns_log_posteriors(tmp_path: Path) -> None:
    recognizer = OnnxRecognizer(tiny_model(tmp_path), tmp_path / "vocab.json")
    waveform = np.concatenate([np.full(FRAME, 1.0), np.full(FRAME, -1.0)]).astype(np.float32)
    posteriors = recognizer.log_posteriors(waveform)
    assert posteriors.shape == (2, 3)
    np.testing.assert_allclose(np.exp(posteriors).sum(axis=1), 1.0, rtol=1e-5)
    assert posteriors[0].argmax() == 1  # loud positive frame → "a"
    assert posteriors[1].argmax() != 1
    assert recognizer.blank_id == 0
    assert recognizer.model_version == "tiny@onnx"
    assert recognizer.frame_seconds == pytest.approx(0.02)


def test_normalise_matches_the_feature_extractor() -> None:
    audio = np.array([0.0, 2.0, 4.0], dtype=np.float32)
    out = normalise(audio)
    assert out.mean() == pytest.approx(0.0, abs=1e-6)
    assert out.std() == pytest.approx(1.0, rel=1e-3)
    np.testing.assert_allclose(np.exp(log_softmax(np.array([[1.0, 1.0]]))), [[0.5, 0.5]])


def test_missing_files_raise_model_unavailable(tmp_path: Path) -> None:
    recognizer = OnnxRecognizer(tmp_path / "none.onnx", tmp_path / "none.json")
    with pytest.raises(ModelUnavailableError):
        _ = recognizer.vocab
    with pytest.raises(ModelUnavailableError):
        recognizer.log_posteriors(np.zeros(FRAME, dtype=np.float32))
