"""Mispronunciation-detection evaluation on speechocean762 (Hugging Face mirror, parquet).

Run with `uv run --with pyarrow python -m app.eval.speechocean`. Speakers are Mandarin L1,
so the numbers calibrate the pipeline, not Vietnamese learners.
"""

import argparse
import json
import logging
import random
from collections import defaultdict
from dataclasses import asdict, dataclass
from pathlib import Path

import numpy as np
import pyarrow.parquet as pq
from numpy.typing import NDArray

from app.config import Settings
from app.constants import ERROR_PRECISION_GATE, GOP_CHECK_THRESHOLD, GOP_OK_THRESHOLD
from app.container import AppContainer
from app.domain.aligner import PhonemeAligner
from app.domain.ctc_decoder import greedy_decode
from app.domain.error_catalog import ErrorCatalog
from app.domain.gop_scorer import GopScorer
from app.domain.phoneme_inventory import ARPABET, espeak_to_arpabet
from app.domain.verdict import audio_verdict, is_free_variant
from app.enums import AlignmentOp
from app.ml.audio import AudioDecoder

logger = logging.getLogger(__name__)
REPO = Path(__file__).resolve().parents[3]
PARQUET = REPO / "data/datasets/speechocean762-hf/data/test-00000-of-00001.parquet"
MIN_SUPPORT = 15
CORRECT_SCORE = 2.0


@dataclass(frozen=True, slots=True)
class PhoneObservation:
    """One expected phone of one utterance with expert score and pipeline output."""

    utterance: int
    word: str
    phone: str
    expert: float
    gop: float
    op: str
    heard: str
    verdict: str
    error_id: str | None


def load_rows(limit: int, seed: int) -> list[dict[str, object]]:
    """Up to `limit` utterances, sampled per speaker with a fixed seed."""
    table = pq.read_table(PARQUET).to_pylist()
    by_speaker: dict[str, list[dict[str, object]]] = defaultdict(list)
    for row in table:
        by_speaker[str(row["speaker"])].append(row)
    rng = random.Random(seed)  # noqa: S311 - reproducible sampling, not security
    speakers = sorted(by_speaker)
    rng.shuffle(speakers)
    chosen: list[dict[str, object]] = []
    per_speaker = max(1, limit // max(len(speakers), 1))
    for speaker in speakers:
        rows = by_speaker[speaker]
        rng.shuffle(rows)
        chosen.extend(rows[:per_speaker])
        if len(chosen) >= limit:
            break
    return chosen[:limit]


def strip(phone: str) -> str:
    """Strip stress digits; speechocean phones occasionally come lower-case."""
    cleaned = phone.rstrip("0123456789").upper()
    return cleaned if cleaned in ARPABET else "?"


class Evaluator:
    """Runs the recogniser + scorer + aligner + catalogue over the dataset."""

    def __init__(self, settings: Settings) -> None:
        self._decoder = AudioDecoder()
        # The configured recogniser (COACH_RECOGNIZER=onnx evaluates the model the iPhone runs).
        self._recognizer = AppContainer(settings).recognizer
        self._scorer = GopScorer(self._recognizer.vocab, self._recognizer.blank_id)
        self._aligner = PhonemeAligner()
        self._catalog = ErrorCatalog.load(settings.content_dir, None)

    @property
    def model_version(self) -> str:
        """Recogniser identifier."""
        return self._recognizer.model_version

    @property
    def catalog(self) -> ErrorCatalog:
        """The Vietnamese error catalogue."""
        return self._catalog

    def observe(self, index: int, row: dict[str, object]) -> list[PhoneObservation]:
        """Phone-level observations for one utterance."""
        audio = row["audio"]
        payload: bytes = audio["bytes"]  # type: ignore[index]
        waveform = self._decoder.decode(payload)
        words: list[dict[str, object]] = row["words"]  # type: ignore[assignment]
        expected, experts, word_of, finals = self._expected(words)
        log_probs = self._recognizer.log_posteriors(waveform)
        heard = espeak_to_arpabet(
            greedy_decode(log_probs, self._recognizer.vocab, self._recognizer.blank_id)
        )
        pairs = [
            p for p in self._aligner.align(expected, heard) if p.op is not AlignmentOp.INSERTION
        ]
        segments = self._scorer.score(log_probs, expected)
        observations: list[PhoneObservation] = []
        for i, symbol in enumerate(expected):
            known = self._catalog.find(symbol, pairs[i].actual, pairs[i].op, finals[i])
            verdict = self._verdict(pairs[i].op, segments[i].gop, known is not None)
            # Same free-variant rule as the assessment service, so the numbers describe the app.
            if pairs[i].op is AlignmentOp.SUBSTITUTION and is_free_variant(
                symbol,
                pairs[i].actual,
                expected[i + 1] if not finals[i] else None,
                is_initial=i == 0 or finals[i - 1],
                is_final=finals[i],
            ):
                known, verdict = None, "ok"
            observations.append(
                PhoneObservation(
                    index,
                    word_of[i],
                    symbol,
                    experts[i],
                    segments[i].gop,
                    pairs[i].op.value,
                    pairs[i].actual,
                    verdict,
                    known.id if known else None,
                )
            )
        return observations

    @staticmethod
    def _expected(
        words: list[dict[str, object]],
    ) -> tuple[list[str], list[float], list[str], list[bool]]:
        expected: list[str] = []
        experts: list[float] = []
        word_of: list[str] = []
        finals: list[bool] = []
        for word in words:
            phones: list[str] = word["phones"]  # type: ignore[assignment]
            scores: list[float] = word["phones-accuracy"]  # type: ignore[assignment]
            for position, (phone, score) in enumerate(zip(phones, scores, strict=True)):
                expected.append(strip(phone))
                experts.append(float(score))
                word_of.append(str(word["text"]))
                finals.append(position == len(phones) - 1)
        return expected, experts, word_of, finals

    @staticmethod
    def _verdict(op: AlignmentOp, gop: float, known: bool) -> str:
        """Audio verdict exactly as the service computes it, with every catalogue error enabled."""
        return audio_verdict(op, gop, known).value


def average_ranks(values: NDArray[np.float64]) -> NDArray[np.float64]:
    """Ranks starting at 1 with ties sharing their average rank."""
    _unique, inverse, counts = np.unique(values, return_inverse=True, return_counts=True)
    starts = np.cumsum(counts) - counts
    return (starts + (counts + 1) / 2.0)[inverse]


def spearman(x: NDArray[np.float64], y: NDArray[np.float64]) -> float:
    """Spearman rank correlation (average ranks for ties)."""
    return float(np.corrcoef(average_ranks(x), average_ranks(y))[0, 1])


def correlations(observations: list[PhoneObservation]) -> dict[str, float]:
    """Pearson and Spearman between GOP and expert phone accuracy."""
    gop = np.array([o.gop for o in observations], dtype=np.float64)
    expert = np.array([o.expert for o in observations], dtype=np.float64)
    return {
        "pearson": round(float(np.corrcoef(gop, expert)[0, 1]), 3),
        "spearman": round(spearman(gop, expert), 3),
    }


def per_error(
    observations: list[PhoneObservation], catalog: ErrorCatalog
) -> dict[str, dict[str, float | int]]:
    """Precision/recall/support per catalogue error."""
    result: dict[str, dict[str, float | int]] = {}
    for error in catalog.all:
        flagged = [o for o in observations if o.error_id == error.id and o.verdict == "error"]
        hits = [o for o in flagged if o.expert < CORRECT_SCORE]
        relevant = [
            o for o in observations if o.phone == error.expected and o.expert < CORRECT_SCORE
        ]
        result[error.id] = {
            "support": len(flagged),
            "true_positives": len(hits),
            "precision": round(len(hits) / len(flagged), 3) if flagged else 0.0,
            "recall": round(len(hits) / len(relevant), 3) if relevant else 0.0,
            "expert_mispronounced_phones": len(relevant),
        }
    return result


def detection(observations: list[PhoneObservation]) -> dict[str, float | int]:
    """Share of expert-mispronounced phones we did not call `ok` (what a free variant can cost)."""
    wrong = [o for o in observations if o.expert < CORRECT_SCORE]
    flagged = sum(1 for o in wrong if o.verdict != "ok")
    return {
        "expert_wrong_phones": len(wrong),
        "flagged_rate": round(flagged / len(wrong), 3) if wrong else 0.0,
    }


def false_alarms(observations: list[PhoneObservation]) -> dict[str, float | int]:
    """Share of expert-correct phones we did not call `ok`, and share we would call `error`."""
    correct = [o for o in observations if o.expert >= CORRECT_SCORE]
    not_ok = sum(1 for o in correct if o.verdict != "ok")
    error = sum(1 for o in correct if o.verdict == "error")
    return {
        "expert_correct_phones": len(correct),
        "not_ok_rate": round(not_ok / len(correct), 3) if correct else 0.0,
        "error_rate": round(error / len(correct), 3) if correct else 0.0,
    }


def main() -> None:
    """Evaluate, write JSON and the enabled-errors list."""
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=300)
    parser.add_argument("--seed", type=int, default=7)
    parser.add_argument("--out", type=Path, default=REPO / "data/eval/speechocean762.json")
    parser.add_argument("--enabled", type=Path, default=REPO / "content/enabled_errors.json")
    args = parser.parse_args()
    evaluator = Evaluator(Settings(web_dist_dir=None))
    rows = load_rows(args.limit, args.seed)
    observations: list[PhoneObservation] = []
    for index, row in enumerate(rows):
        observations.extend(evaluator.observe(index, row))
        if index % 50 == 0:
            logger.info("utterance %d/%d", index, len(rows))
    errors = per_error(observations, evaluator.catalog)
    enabled = sorted(
        error_id
        for error_id, stats in errors.items()
        if float(stats["precision"]) >= ERROR_PRECISION_GATE
        and int(stats["support"]) >= MIN_SUPPORT
    )
    report = {
        "dataset": "speechocean762 test split (Mandarin L1 speakers), Hugging Face mirror",
        "utterances": len(rows),
        "phones": len(observations),
        "speakers": len({str(r["speaker"]) for r in rows}),
        "model_version": evaluator.model_version,
        "thresholds": {"gop_ok": GOP_OK_THRESHOLD, "gop_check": GOP_CHECK_THRESHOLD},
        "correlation": correlations(observations),
        "false_alarms": false_alarms(observations),
        "detection": detection(observations),
        "per_error": errors,
        "enabled_errors": enabled,
        "gate": {"precision": ERROR_PRECISION_GATE, "min_support": MIN_SUPPORT},
    }
    args.out.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (args.out.parent / "speechocean762-phones.json").write_text(
        json.dumps([asdict(o) for o in observations]) + "\n", encoding="utf-8"
    )
    args.enabled.write_text(json.dumps(enabled) + "\n", encoding="utf-8")
    logger.info(json.dumps({k: v for k, v in report.items() if k != "per_error"}, indent=2))


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    main()
