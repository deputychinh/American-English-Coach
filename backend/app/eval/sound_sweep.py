"""Sweep every drill word through the real scorer with native synthetic voices (`say`).

A native voice saying the word correctly should get the target sound `ok`. Every other verdict
is a false alarm a learner would see as "the app says I am wrong when I am right". The sweep
also checks that each word is in the dictionary and that its reference clip can be produced.
TTS is not learner data: the numbers bound false alarms on clean speech, nothing more.
"""

import argparse
import json
import logging
import tempfile
from collections import defaultdict
from dataclasses import asdict, dataclass
from pathlib import Path

from app.config import Settings
from app.container import AppContainer
from app.enums import Verdict
from app.errors import DomainError
from app.eval.synthetic_contrast import available_voices, synthesize
from app.services.assessment_service import AssessmentInput

logger = logging.getLogger(__name__)
REPO = Path(__file__).resolve().parents[3]
RELIABILITY_FILE = REPO / "content" / "scorer_reliability.json"
# Native-voice false-alarm rate bands: below 15 % the scorer is trusted, from 35 % the app tells
# the learner the scorer often confuses the sound and to compare recordings by ear.
HIGH_MAX_RATE = 0.15
MEDIUM_MAX_RATE = 0.35


@dataclass(frozen=True, slots=True)
class WordTrial:
    """One drill word spoken by one voice, and what the scorer said about the target sound."""

    sound: str
    symbol: str
    word: str
    voice: str
    target_verdict: str
    heard: str
    gop: float
    other_flags: int
    problem: str | None


def target_phone_of(arpabet: str) -> str:
    """Scored phone of a drill, the same rule as the app's `targetPhoneOf` ("AH1,AH2" → "AH")."""
    first = arpabet.split(",", maxsplit=1)[0].strip().split()
    return first[0].rstrip("012") if first else ""


def run_word(container: AppContainer, drill: dict[str, object], word: str, voice: str) -> WordTrial:
    """Score one word; a missing word or clip is recorded as a problem instead of raising."""
    symbol = target_phone_of(str(drill["arpabet"]))
    base = {"sound": str(drill["id"]), "symbol": symbol, "word": word, "voice": voice}
    try:
        container.audio.reference(word)
        audio = synthesize(word, voice, REPO / "data" / "eval" / "say")
        result = container.assessment.assess(
            AssessmentInput(f"sweep:{word}", word, "word", audio, [], None)
        )
    except DomainError as error:
        return WordTrial(**base, target_verdict="n/a", heard="", gop=0.0, other_flags=0,
                         problem=f"{type(error).__name__}: {error}")  # fmt: skip
    phones = [p for w in result.words for p in w.phones]
    targets = [p for p in phones if p.symbol == symbol]
    if not targets:
        return WordTrial(**base, target_verdict="n/a", heard="", gop=0.0, other_flags=0,
                         problem="target sound not in the dictionary pronunciation")  # fmt: skip
    worst = min(targets, key=lambda p: p.gop)
    others = sum(1 for p in phones if p.symbol != symbol and p.verdict is not Verdict.OK)
    return WordTrial(**base, target_verdict=worst.verdict.value, heard=worst.heard,
                     gop=round(worst.gop, 2), other_flags=others, problem=None)  # fmt: skip


def summarize(trials: list[WordTrial]) -> list[dict[str, object]]:
    """Per sound: false-alarm rate on the target and the words that caused them, worst first."""
    by_sound: dict[str, list[WordTrial]] = defaultdict(list)
    for trial in trials:
        by_sound[trial.sound].append(trial)
    rows = []
    for sound, items in by_sound.items():
        scored = [t for t in items if t.problem is None]
        alarms = [t for t in scored if t.target_verdict != Verdict.OK.value]
        rows.append({
            "sound": sound,
            "symbol": items[0].symbol,
            "scored": len(scored),
            "false_alarms": len(alarms),
            "rate": round(len(alarms) / len(scored), 2) if scored else 1.0,
            "words": sorted({f"{t.word}→{t.heard or '∅'}" for t in alarms}),
            "problems": sorted({f"{t.word}: {t.problem}" for t in items if t.problem}),
        })  # fmt: skip
    return sorted(rows, key=lambda row: (-float(str(row["rate"])), str(row["sound"])))


def reliability(rate: float) -> str:
    """Band of a native-voice false-alarm rate."""
    if rate < HIGH_MAX_RATE:
        return "high"
    return "medium" if rate < MEDIUM_MAX_RATE else "low"


def write_reliability(sounds: list[dict[str, object]], voices: list[str]) -> None:
    """Content file the API serves: how far the scorer can be trusted on each sound."""
    payload = {
        "source": f"make sweep: drill words with {', '.join(voices)}",
        "sounds": {
            str(row["sound"]): {
                "native_false_alarm_rate": row["rate"],
                "level": reliability(float(str(row["rate"]))),
            }
            for row in sorted(sounds, key=lambda row: str(row["sound"]))
        },
    }
    RELIABILITY_FILE.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


def main() -> None:
    """Run the sweep over content/sound_drills.json and write the report."""
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", type=Path, default=REPO / "data" / "eval" / "sound_sweep.json")
    parser.add_argument("--sound", action="append", help="limit to these drill ids (repeatable)")
    parser.add_argument(
        "--write-content", action="store_true", help=f"also write {RELIABILITY_FILE.name}"
    )
    args = parser.parse_args()
    (REPO / "data" / "eval" / "say").mkdir(parents=True, exist_ok=True)
    drills = json.loads((REPO / "content" / "sound_drills.json").read_text(encoding="utf-8"))
    if args.sound:
        drills = [d for d in drills if d["id"] in set(args.sound)]
    voices = available_voices()
    with tempfile.TemporaryDirectory() as tmp:
        defaults = Settings()
        container = AppContainer(
            Settings(data_dir=Path(tmp), model_dir=defaults.resolved_model_dir, web_dist_dir=None)
        )
        trials = [
            run_word(container, drill, entry["word"], voice)
            for drill in drills
            for entry in drill["words"]
            for voice in voices
        ]
        model_version = container.recognizer.model_version
    scored = [t for t in trials if t.problem is None]
    alarms = sum(1 for t in scored if t.target_verdict != Verdict.OK.value)
    sounds = summarize(trials)
    report = {
        "model_version": model_version,
        "voices": voices,
        "total": {
            "trials": len(trials),
            "scored": len(scored),
            "false_alarms": alarms,
            "rate": round(alarms / max(1, len(scored)), 3),
        },
        "sounds": sounds,
        "trials": [asdict(t) for t in trials],
    }
    if args.write_content and not args.sound:
        write_reliability(sounds, voices)
    args.out.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    logger.info(json.dumps(report["total"]))
    for row in sounds[:15]:
        logger.info("%s %s %s/%s %s %s", row["sound"], row["symbol"], row["false_alarms"],
                    row["scored"], row["words"], row["problems"])  # fmt: skip


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    main()
