"""Vietnamese pilot tooling: export machine verdicts for human labelling, then measure precision.

Workflow (docs/pilot.md):

1. Learners practise with consent; every run is stored with per-phone verdicts.
2. `python -m app.eval.pilot export --out pilot.csv` writes one row per flagged phone (verdict
   `check`/`error` with a known error id) plus a sample of `ok` phones as controls. A rater fills
   the `label` column: `wrong` (the learner really made that error), `correct` (false alarm) or
   `unsure`.
3. `python -m app.eval.pilot report --labels pilot.csv` prints precision per error id and writes
   `enabled_errors.candidates.json` with the ids that clear the precision gate and support
   threshold. Copy the ids you accept into `content/enabled_errors.json`.
"""

import argparse
import csv
import json
import logging
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path

from sqlalchemy import select

from app.config import Settings
from app.constants import ERROR_PRECISION_GATE
from app.db.engine import SessionFactory, create_sqlite_engine
from app.db.models import AssessmentRun, PhonemeResult
from app.enums import Verdict

logger = logging.getLogger(__name__)
FIELDS = (
    "run_id",
    "profile_id",
    "created_at",
    "disputed",
    "word",
    "phoneme",
    "verdict",
    "error_id",
    "gop",
    "visual",
    "label",
)
LABELS = {"wrong", "correct", "unsure"}
MIN_SUPPORT = 20
CONTROL_EVERY = 10


@dataclass(frozen=True, slots=True)
class ErrorPrecision:
    """Rater agreement for one error id."""

    error_id: str
    support: int
    wrong: int
    correct: int
    unsure: int

    @property
    def precision(self) -> float:
        """Share of rated rows where the rater confirmed the error (unsure rows excluded)."""
        rated = self.wrong + self.correct
        return self.wrong / rated if rated else 0.0

    @property
    def passes_gate(self) -> bool:
        """Enough rated rows and precision at or above the product gate."""
        return self.wrong + self.correct >= MIN_SUPPORT and self.precision >= ERROR_PRECISION_GATE


def export_rows(sessions: SessionFactory) -> list[dict[str, object]]:
    """Flagged phones (check/error with an error id) plus every Nth `ok` phone as a control."""
    rows: list[dict[str, object]] = []
    controls = 0
    with sessions.session() as session:
        pairs = session.execute(
            select(PhonemeResult, AssessmentRun)
            .join(AssessmentRun, AssessmentRun.id == PhonemeResult.run_id)
            .order_by(AssessmentRun.created_at, PhonemeResult.id)
        ).all()
        for phone, run in pairs:
            flagged = phone.verdict != Verdict.OK.value and phone.error_id
            if not flagged:
                controls += 1
                if controls % CONTROL_EVERY:
                    continue
            rows.append(
                {
                    "run_id": run.id,
                    "profile_id": run.profile_id,
                    "created_at": run.created_at.isoformat(),
                    "disputed": int(run.disputed),
                    "word": phone.word,
                    "phoneme": phone.phoneme,
                    "verdict": phone.verdict,
                    "error_id": phone.error_id or "",
                    "gop": round(phone.gop, 3),
                    "visual": phone.visual,
                    "label": "",
                }
            )
    return rows


def write_csv(rows: list[dict[str, object]], target: Path) -> None:
    """UTF-8 CSV with a header, ready for a spreadsheet."""
    with target.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=FIELDS)
        writer.writeheader()
        writer.writerows(rows)


def read_labels(source: Path) -> list[dict[str, str]]:
    """Labelled rows; unknown labels are rejected so typos never count as evidence."""
    with source.open(encoding="utf-8", newline="") as handle:
        rows = list(csv.DictReader(handle))
    for row in rows:
        label = row.get("label", "").strip().lower()
        if label and label not in LABELS:
            raise ValueError(f"unknown label {label!r} in run {row.get('run_id')}")
        row["label"] = label
    return rows


def precision_by_error(rows: list[dict[str, str]]) -> list[ErrorPrecision]:
    """Rater agreement per error id over flagged rows that carry a label."""
    counts: dict[str, dict[str, int]] = defaultdict(lambda: {"wrong": 0, "correct": 0, "unsure": 0})
    for row in rows:
        error_id = row.get("error_id", "")
        label = row.get("label", "")
        if not error_id or not label:
            continue
        counts[error_id][label] += 1
    return sorted(
        (
            ErrorPrecision(error_id, sum(c.values()), c["wrong"], c["correct"], c["unsure"])
            for error_id, c in counts.items()
        ),
        key=lambda e: (-e.precision, -e.support, e.error_id),
    )


def false_alarm_rate(rows: list[dict[str, str]]) -> float | None:
    """Share of flagged, rated rows the rater called correct (None when nothing is rated)."""
    rated = [r for r in rows if r.get("error_id") and r.get("label") in {"wrong", "correct"}]
    if not rated:
        return None
    return sum(1 for r in rated if r["label"] == "correct") / len(rated)


def format_report(stats: list[ErrorPrecision], false_alarms: float | None) -> str:
    """Plain-text table for the terminal and the docs."""
    lines = [
        f"{'error_id':<28} {'rated':>5} {'wrong':>5} {'ok':>5} {'unsure':>6} {'prec':>6}  gate"
    ]
    for s in stats:
        lines.append(
            f"{s.error_id:<28} {s.wrong + s.correct:>5} {s.wrong:>5} {s.correct:>5} "
            f"{s.unsure:>6} {s.precision:>6.2f}  {'PASS' if s.passes_gate else '-'}"
        )
    if false_alarms is not None:
        lines.append(f"\nfalse-alarm rate on flagged phones: {false_alarms:.1%}")
    lines.append(f"gate: precision >= {ERROR_PRECISION_GATE} with >= {MIN_SUPPORT} rated rows")
    return "\n".join(lines)


def main() -> None:
    """CLI entry point."""
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    sub = parser.add_subparsers(dest="command", required=True)
    export = sub.add_parser("export", help="write flagged phones to a CSV for labelling")
    export.add_argument("--out", type=Path, default=Path("pilot.csv"))
    report = sub.add_parser("report", help="precision per error id from a labelled CSV")
    report.add_argument("--labels", type=Path, required=True)
    report.add_argument("--out", type=Path, default=Path("enabled_errors.candidates.json"))
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(message)s")

    if args.command == "export":
        settings = Settings()
        sessions = SessionFactory(create_sqlite_engine(settings.database_path))
        rows = export_rows(sessions)
        write_csv(rows, args.out)
        logger.info("wrote %d rows to %s", len(rows), args.out)
        return

    labelled = read_labels(args.labels)
    stats = precision_by_error(labelled)
    logger.info("%s", format_report(stats, false_alarm_rate(labelled)))
    candidates = [s.error_id for s in stats if s.passes_gate]
    args.out.write_text(json.dumps(candidates, indent=2) + "\n", encoding="utf-8")
    logger.info("candidates (%d) written to %s", len(candidates), args.out)


if __name__ == "__main__":
    main()
