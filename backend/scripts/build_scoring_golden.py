"""Golden cases for the TypeScript scorer: real posteriors in, the Python verdicts out.

Each case keeps only what the scorer reads from the posterior matrix (the blank, every column
that realises an ARPAbet phone, and each frame's argmax value) so the files stay small while
the TypeScript side rebuilds a matrix that scores exactly like the full one.
Run: `uv run python scripts/build_scoring_golden.py` (needs the exported ONNX model and `say`).
"""

import base64
import json
import random
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Any

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))

from app.config import Settings  # noqa: E402
from app.container import AppContainer  # noqa: E402
from app.domain.error_catalog import ErrorCatalog  # noqa: E402
from app.domain.phoneme_inventory import ARPABET, arpabet_variants  # noqa: E402
from app.eval.synthetic_contrast import SUBSTITUTIONS  # noqa: E402
from app.ml.audio import AudioDecoder  # noqa: E402
from app.schemas.assessment import AssessmentResponse, MouthFrame  # noqa: E402
from app.services.assessment_service import AssessmentInput  # noqa: E402

OUT = ROOT / "web" / "src" / "data" / "scoring" / "golden.json"
SAY = ROOT / "data" / "eval" / "say"
WORDS_PER_VOICE = 14
SENTENCES = [
    ("Please keep the green tea.", "statement"),
    ("Do you think it is right?", "question"),
    ("Where did you put the book?", "wh_question"),
    ("She sells fresh fish.", "statement"),
]
CAMERA_WORDS = ["moon", "food", "see", "five"]
FPS = 30


def say(text: str, folder: Path) -> bytes:
    """WAV bytes from macOS `say` (Samantha, 16 kHz)."""
    out = folder / f"{abs(hash(text))}.wav"
    subprocess.run(  # noqa: S603 - fixed argv
        ["say", "-v", "Samantha", "-o", str(out), "--data-format=LEI16@16000", text],  # noqa: S607
        check=True,
        capture_output=True,
        timeout=60,
    )
    return out.read_bytes()


def used_columns(vocab: dict[str, int], blank: int) -> list[int]:
    """Columns the scorer reads besides the argmax: blank and every phone variant."""
    columns = {blank}
    for symbol in ARPABET:
        columns.update(vocab[token] for token in arpabet_variants(symbol) if token in vocab)
    return sorted(columns)


def pack(matrix: np.ndarray, columns: list[int]) -> dict[str, Any]:
    """Selected columns + per-frame argmax (column and value), base64 Float32 / Int32."""
    argmax = matrix.argmax(axis=1).astype(np.int32)
    return {
        "frames": int(matrix.shape[0]),
        "vocab": int(matrix.shape[1]),
        "columns": columns,
        "values": base64.b64encode(matrix[:, columns].astype(np.float32).tobytes()).decode(),
        "argmax": base64.b64encode(argmax.tobytes()).decode(),
        "argmaxValues": base64.b64encode(
            matrix[np.arange(matrix.shape[0]), argmax].astype(np.float32).tobytes()
        ).decode(),
    }


def target_features(container: AppContainer, word: str) -> dict[str, float]:
    """Mid-points of the target ranges of the word's first visible sound (others at 0.5)."""
    features = dict.fromkeys(container.visemes.feature_names, 0.5)
    entry = container.dictionary.lookup(word)
    for phone in entry.primary if entry else ():
        group = container.visemes.group_of(phone.symbol)
        if group is None:
            continue
        for name, (low, high) in container.visemes.target(group).targets.items():
            features[name] = (
                (low if low is not None else 0.0) + (high if high is not None else 1.0)
            ) / 2
        break
    return features


def camera_frames(
    container: AppContainer, word: str, seconds: float, start: float
) -> list[MouthFrame]:
    """On target for the first half of the take, scattered outside for the rest."""
    names = container.visemes.feature_names
    on_target = target_features(container, word)
    frames: list[MouthFrame] = []
    count = int(seconds * FPS)
    rng = random.Random(word)  # noqa: S311 - reproducible test data, not security
    for index in range(count):
        inside = index < count // 2
        features = {
            name: (on_target[name] if inside else rng.choice([0.02, 0.98])) for name in names
        }
        frames.append(MouthFrame(t=start + index / FPS, features=features, quality=0.9))
    return frames


def response_view(response: AssessmentResponse) -> dict[str, Any]:
    """What the TypeScript scorer must reproduce (no id, model version or prosody)."""
    data = response.model_dump(mode="json")
    return {"words": data["words"], "summary": data["summary"]}


def main() -> int:
    """Pick cases, score them with the ONNX model and write the golden file."""
    rng = random.Random(7)  # noqa: S311 - reproducible test data, not security
    with tempfile.TemporaryDirectory() as tmp:
        defaults = Settings()
        settings = Settings(
            data_dir=Path(tmp),
            model_dir=defaults.resolved_model_dir,
            web_dist_dir=None,
            recognizer="onnx",
        )
        container = AppContainer(settings)
        strict = AppContainer(settings)
        # Every catalogued error enabled, so the golden set also covers the `error` verdict.
        strict.__dict__["catalog"] = ErrorCatalog(
            container.catalog.all, frozenset(e.id for e in container.catalog.all)
        )
        vocab, blank = container.recognizer.vocab, container.recognizer.blank_id
        by_voice: dict[str, list[Path]] = {}
        for clip in sorted(SAY.glob("*.wav")):
            # The folder also holds deliberate mispronunciations ("tink"); keep real words.
            if container.dictionary.lookup(clip.stem.split("-", 1)[1].replace("_", " ")):
                by_voice.setdefault(clip.name.split("-", 1)[0], []).append(clip)
        chosen = [c for files in by_voice.values() for c in rng.sample(files, WORDS_PER_VOICE)]
        columns = used_columns(vocab, blank)
        inputs: list[tuple[str, str, bytes, bool]] = [
            (clip.stem.split("-", 1)[1].replace("_", " "), "word", clip.read_bytes(), False)
            for clip in chosen
        ]
        # Deliberate substitutions, scored against the target word, with every error enabled.
        mistakes = [
            (target, (SAY / f"Samantha-{spoken}.wav").read_bytes())
            for target, subs in SUBSTITUTIONS.items()
            for spoken, _error in subs
            if (SAY / f"Samantha-{spoken}.wav").exists()
        ]
        inputs += [(text, kind, say(text, Path(tmp)), False) for text, kind in SENTENCES]
        inputs += [(word, "word", say(word, Path(tmp)), True) for word in CAMERA_WORDS]
        decoder = AudioDecoder()
        cases = []
        jobs = [(text, kind, audio, camera, container) for text, kind, audio, camera in inputs]
        jobs += [(text, "word", audio, False, strict) for text, audio in mistakes]
        jobs += [(text, "word", say(text, Path(tmp)), True, strict) for text in CAMERA_WORDS[:2]]
        for text, kind, audio, with_camera, scorer in jobs:
            waveform = decoder.decode(audio)
            matrix = container.recognizer.log_posteriors(waveform)
            seconds = len(waveform) / 16_000
            frames = camera_frames(container, text, seconds, 100.0) if with_camera else []
            response = scorer.assessment.assess(
                AssessmentInput(
                    f"golden:{text}", text, kind, audio, frames, 100.0 if with_camera else None
                )
            )
            cases.append(
                {
                    "text": text,
                    "kind": kind,
                    "itemId": f"golden:{text}",
                    "audioStartedAt": 100.0 if with_camera else None,
                    "enabledErrors": sorted(scorer.catalog.enabled_ids),
                    "mouthFrames": [f.model_dump(mode="json") for f in frames],
                    "posteriors": pack(matrix, columns),
                    "expected": response_view(response),
                }
            )
    OUT.write_text(json.dumps({"cases": cases}, ensure_ascii=False) + "\n", encoding="utf-8")
    print(len(cases), "cases,", OUT.stat().st_size // 1024, "KB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
