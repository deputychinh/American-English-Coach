"""Sanity check with synthetic speech: correct prompts vs deliberate substitutions (`say`).

TTS is not learner data. The set only shows that the pipeline stays quiet on correct
synthetic speech and reacts when the synthesised word carries a known substitution.
"""

import argparse
import json
import logging
import subprocess
import tempfile
from dataclasses import asdict, dataclass
from pathlib import Path

from app.config import Settings
from app.container import AppContainer
from app.enums import Verdict
from app.services.assessment_service import AssessmentInput

logger = logging.getLogger(__name__)
REPO = Path(__file__).resolve().parents[3]
VOICES = ("Samantha", "Eddy (English (US))")

# target word → (spoken spelling, error id it should trigger, focus phone position from the end?)
SUBSTITUTIONS: dict[str, list[tuple[str, str]]] = {
    "think": [("tink", "th_to_t_s_f"), ("sink", "th_to_t_s_f"), ("fink", "th_to_t_s_f")],
    "this": [("dis", "dh_to_d_z"), ("ziss", "dh_to_d_z")],
    "she": [("see", "sh_to_s")],
    "chip": [("sip", "ch_to_s_sh"), ("ship", "ch_to_s_sh")],
    "vest": [("west", "v_to_w"), ("best", "v_to_w")],
    "west": [("vest", "w_to_v")],
    "bad": [("bed", "ae_to_eh")],
    "seat": [("sit", "iy_to_ih")],
    "pool": [("pull", "uw_to_uh")],
    "stop": [("sto", "final_p_dropped"), ("stah", "final_p_dropped")],
    "live": [("li", "final_v_dropped")],
    "cats": [("cat", "final_s_dropped")],
    "worked": [("work", "final_t_dropped")],
    "right": [("light", "r_to_l")],
}


@dataclass(frozen=True, slots=True)
class Trial:
    """One synthesised prompt and what the pipeline said about the focus phone."""

    voice: str
    target: str
    spoken: str
    error_id: str
    focus_phone: str
    verdict: str
    heard: str
    gop: float
    flagged_error_id: str | None


def synthesize(text: str, voice: str, folder: Path) -> bytes:
    """WAV bytes from macOS `say` (16 kHz PCM)."""
    out = folder / f"{voice.split(' ', maxsplit=1)[0]}-{text.replace(' ', '_')}.wav"
    if not out.exists():
        subprocess.run(  # noqa: S603 - fixed argv
            ["say", "-v", voice, "-o", str(out), "--data-format=LEI16@16000", text],  # noqa: S607
            check=True,
            capture_output=True,
            timeout=60,
        )
    return out.read_bytes()


def focus_phone_of(container: AppContainer, error_id: str) -> str:
    """The expected phone of a catalogue entry."""
    return next(e.expected for e in container.catalog.all if e.id == error_id)


def run_trial(
    container: AppContainer, voice: str, target: str, spoken: str, error_id: str, folder: Path
) -> Trial:
    """Assess `spoken` audio against the `target` prompt and read the focus phone verdict."""
    audio = synthesize(spoken, voice, folder)
    result = container.assessment.assess(
        AssessmentInput(f"synthetic:{target}", target, "word", audio, [], None)
    )
    focus = focus_phone_of(container, error_id)
    phones = [p for p in result.words[0].phones if p.symbol == focus]
    phone = phones[-1] if phones else result.words[0].phones[-1]
    return Trial(
        voice, target, spoken, error_id, focus, phone.verdict.value, phone.heard,
        phone.gop, phone.error_id,
    )  # fmt: skip


def available_voices() -> list[str]:
    """Voices from VOICES that this machine has."""
    listing = subprocess.run(
        ["say", "-v", "?"],  # noqa: S607
        check=True, capture_output=True, text=True, timeout=30,
    ).stdout  # fmt: skip
    return [voice for voice in VOICES if voice in listing]


def summarize(trials: list[Trial]) -> dict[str, dict[str, float | int]]:
    """Per error id: false-alarm rate on correct prompts and detection rate on substitutions."""
    summary: dict[str, dict[str, float | int]] = {}
    for error_id in sorted({t.error_id for t in trials}):
        correct = [t for t in trials if t.error_id == error_id and t.spoken == t.target]
        wrong = [t for t in trials if t.error_id == error_id and t.spoken != t.target]
        false_alarms = sum(1 for t in correct if t.verdict != Verdict.OK.value)
        detected = sum(1 for t in wrong if t.verdict != Verdict.OK.value)
        attributed = sum(1 for t in wrong if t.flagged_error_id == error_id)
        summary[error_id] = {
            "correct_prompts": len(correct),
            "false_alarms": false_alarms,
            "substituted_prompts": len(wrong),
            "detected": detected,
            "attributed_to_error": attributed,
            "detection_rate": round(detected / len(wrong), 2) if wrong else 0.0,
        }
    return summary


def main() -> None:
    """Build the set, run it, write JSON."""
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--out", type=Path, default=REPO / "data" / "eval" / "synthetic_contrast.json"
    )
    args = parser.parse_args()
    folder = REPO / "data" / "eval" / "say"
    folder.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        container = AppContainer(Settings(data_dir=Path(tmp), web_dist_dir=None))
        trials: list[Trial] = []
        for voice in available_voices():
            for target, subs in SUBSTITUTIONS.items():
                error_id = subs[0][1]
                trials.append(run_trial(container, voice, target, target, error_id, folder))
                trials.extend(
                    run_trial(container, voice, target, spoken, sub_error, folder)
                    for spoken, sub_error in subs
                )
    report = {
        "model_version": container.recognizer.model_version,
        "voices": available_voices(),
        "trials": [asdict(t) for t in trials],
        "summary": summarize(trials),
    }
    args.out.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    logger.info(json.dumps(report["summary"], indent=2))


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    main()
