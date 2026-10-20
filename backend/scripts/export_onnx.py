"""Export the phoneme model to ONNX for the iPhone app: fp32 and per-channel int8 MatMul.

Writes `data/models/onnx/{w2v.onnx, w2v.mm8.onnx, vocab.json, manifest.json}`. The manifest
records size and SHA-256 so the app can verify its download. Run:
`uv run python scripts/export_onnx.py` (needs the PyTorch model from `make models`).
"""

import hashlib
import json
import shutil
import sys
from pathlib import Path

import torch
from onnxruntime.quantization import QuantType, quantize_dynamic
from transformers import Wav2Vec2ForCTC

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "data" / "models" / "wav2vec2-xlsr-53-espeak-cv-ft"
OUT = ROOT / "data" / "models" / "onnx"
OPSET = 17


def sha256(path: Path) -> str:
    """Hex SHA-256 of a file, read in chunks."""
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> int:
    """Export, quantize and describe the model files."""
    OUT.mkdir(parents=True, exist_ok=True)
    model = Wav2Vec2ForCTC.from_pretrained(SOURCE).eval()
    fp32 = OUT / "w2v.onnx"
    torch.onnx.export(
        model,
        (torch.zeros(1, 48_000),),
        str(fp32),
        input_names=["input_values"],
        output_names=["logits"],
        dynamic_axes={"input_values": {1: "samples"}, "logits": {1: "frames"}},
        opset_version=OPSET,
        dynamo=False,
    )
    mm8 = OUT / "w2v.mm8.onnx"
    # Per-channel int8 on MatMul only: whole-graph int8 changed 26 of 58 decoded words.
    quantize_dynamic(
        str(fp32),
        str(mm8),
        weight_type=QuantType.QInt8,
        per_channel=True,
        op_types_to_quantize=["MatMul"],
    )
    shutil.copy(SOURCE / "vocab.json", OUT / "vocab.json")
    manifest = {
        "source": SOURCE.name,
        "opset": OPSET,
        "input": "input_values: float32 [1, samples], 16 kHz, zero-mean unit-variance",
        "output": "logits: float32 [1, frames, vocab], 20 ms per frame",
        "files": {
            path.name: {"bytes": path.stat().st_size, "sha256": sha256(path)}
            for path in (fp32, mm8, OUT / "vocab.json")
        },
    }
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(manifest["files"], indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
