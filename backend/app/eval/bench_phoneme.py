"""Latency benchmark of the phoneme recogniser on this machine (`make bench`)."""

import argparse
import json
import logging
import statistics
import time
from pathlib import Path

from app.config import get_settings
from app.ml.audio import AudioDecoder
from app.ml.recognizer import Wav2Vec2Recognizer
from app.ml.tts import SpeechSynthesizer

logger = logging.getLogger(__name__)
SENTENCE = "I think this is the third time she sells fresh fish."


def percentile(values: list[float], share: float) -> float:
    """Nearest-rank percentile of a small sample."""
    ordered = sorted(values)
    return ordered[min(len(ordered) - 1, round(share * (len(ordered) - 1)))]


def run(device: str, rounds: int) -> dict[str, float | str | int]:
    """Measure wall-clock latency of `log_posteriors` for a ~3 s clip."""
    settings = get_settings()
    clip = SpeechSynthesizer(settings.audio_dir, settings.tts_voice).synthesize(SENTENCE)
    waveform = AudioDecoder().decode(clip.read_bytes())
    recognizer = Wav2Vec2Recognizer(settings.resolved_model_dir, device)
    load_start = time.perf_counter()
    recognizer.log_posteriors(waveform)  # warm-up + lazy load
    load_seconds = time.perf_counter() - load_start
    timings: list[float] = []
    for _ in range(rounds):
        start = time.perf_counter()
        recognizer.log_posteriors(waveform)
        timings.append(time.perf_counter() - start)
    return {
        "device": recognizer.model_version.split("@")[1],
        "clip_seconds": round(waveform.shape[0] / 16_000, 2),
        "load_and_warmup_seconds": round(load_seconds, 2),
        "p50_seconds": round(statistics.median(timings), 3),
        "p95_seconds": round(percentile(timings, 0.95), 3),
        "rounds": rounds,
    }


def main() -> None:
    """CLI entry point."""
    parser = argparse.ArgumentParser()
    parser.add_argument("--device", default="auto")
    parser.add_argument("--rounds", type=int, default=10)
    parser.add_argument("--out", type=Path, default=None)
    args = parser.parse_args()
    result = run(args.device, args.rounds)
    text = json.dumps(result, indent=2)
    if args.out:
        args.out.write_text(text + "\n", encoding="utf-8")
    logger.info(text)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    main()
