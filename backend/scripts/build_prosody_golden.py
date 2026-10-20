"""Golden cases for the in-app prosody: audio, the Python (pYIN) tracks and findings.

The TypeScript analyzer must reproduce the findings exactly from the Python tracks; its own
pitch tracker (YIN) is checked against pYIN on the same audio within tolerances.
Run: `uv run python scripts/build_prosody_golden.py` (needs the ONNX model and macOS `say`).
"""

import base64
import json
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
from app.domain.prosody import ProsodyAnalyzer, ProsodyFinding, SyllableNucleus  # noqa: E402
from app.ml.audio import AudioDecoder  # noqa: E402
from app.ml.features import ProsodyFeatureExtractor  # noqa: E402
from app.services.assessment_service import AssessmentInput  # noqa: E402

OUT = ROOT / "web" / "src" / "data" / "scoring" / "prosody-golden.json"
CASES = [
    ("Do you like coffee?", "question", "Samantha"),
    ("Is it raining today?", "question", "Eddy (English (US))"),
    ("Can you help me?", "question", "Samantha"),
    ("I like green tea.", "statement", "Samantha"),
    ("We went to the market.", "statement", "Eddy (English (US))"),
    ("Where do you live?", "wh_question", "Samantha"),
    ("What time is it?", "wh_question", "Eddy (English (US))"),
    ("The table is ready.", "statement", "Samantha"),
    ("Begin the lesson.", "statement", "Eddy (English (US))"),
    ("Are you happy?", "question", "Eddy (English (US))"),
    ("about", "word", "Samantha"),
    ("happy", "word", "Eddy (English (US))"),
]


def say(text: str, voice: str, folder: Path) -> bytes:
    """16 kHz WAV from macOS `say`."""
    out = folder / f"{abs(hash((text, voice)))}.wav"
    subprocess.run(  # noqa: S603 - fixed argv
        ["say", "-v", voice, "-o", str(out), "--data-format=LEI16@16000", text],  # noqa: S607
        check=True,
        capture_output=True,
        timeout=60,
    )
    return out.read_bytes()


def b64(array: np.ndarray, dtype: str) -> str:
    """Base64 of a numpy array in a fixed dtype."""
    return base64.b64encode(np.asarray(array, dtype=dtype).tobytes()).decode()


def main() -> int:
    """Score each case and keep what the TypeScript side needs."""
    with tempfile.TemporaryDirectory() as tmp:
        defaults = Settings()
        container = AppContainer(
            Settings(
                data_dir=Path(tmp),
                model_dir=defaults.resolved_model_dir,
                web_dist_dir=None,
                recognizer="onnx",
            )
        )
        decoder, features = AudioDecoder(), ProsodyFeatureExtractor()
        cases: list[dict[str, Any]] = []
        seen: list[list[SyllableNucleus]] = []
        original = ProsodyAnalyzer.analyze

        def recording(
            self: ProsodyAnalyzer,
            nuclei: list[SyllableNucleus],
            words: list[str],
            expected_rise: bool | None,
        ) -> list[ProsodyFinding]:
            seen.append(list(nuclei))  # what the service passed, stress included
            return original(self, nuclei, words, expected_rise)

        ProsodyAnalyzer.analyze = recording  # type: ignore[method-assign]
        for text, kind, voice in CASES:
            audio = say(text, voice, Path(tmp))
            waveform = decoder.decode(audio)
            tracks = features.extract(waveform)
            response = container.assessment.assess(
                AssessmentInput(f"prosody:{text}", text, kind, audio, [], None)
            )
            pcm = np.clip(np.round(waveform * 32768), -32768, 32767)
            cases.append(
                {
                    "text": text,
                    "kind": kind,
                    "samples": b64(pcm, "<i2"),
                    "f0": b64(np.nan_to_num(tracks.f0, nan=0.0), "<f8"),
                    "rms": b64(tracks.rms, "<f8"),
                    "words": [w.word for w in response.words],
                    "nuclei": [
                        {
                            "wordIndex": n.word_index,
                            "stress": n.stress,
                            "start": n.start,
                            "end": n.end,
                        }
                        for n in seen[-1]
                    ],
                    "prosody": response.model_dump(mode="json")["prosody"],
                }
            )
    OUT.write_text(json.dumps({"cases": cases}, ensure_ascii=False) + "\n", encoding="utf-8")
    print(len(cases), "cases,", OUT.stat().st_size // 1024, "KB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
