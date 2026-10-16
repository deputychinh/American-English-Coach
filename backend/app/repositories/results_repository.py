"""Store and query assessment runs and per-phone results."""

import json
from dataclasses import dataclass
from datetime import datetime

from sqlalchemy import func, select

from app.db.engine import SessionFactory
from app.db.models import AssessmentRun, PhonemeResult
from app.enums import Verdict
from app.errors import NotFoundError


@dataclass(frozen=True, slots=True)
class PhonemeRow:
    """Flat per-phone record to persist."""

    word: str
    phoneme: str
    verdict: Verdict
    gop: float
    visual: str
    error_id: str | None


@dataclass(frozen=True, slots=True)
class RunSummary:
    """Compact view of a run for history lists."""

    id: str
    item_id: str
    text: str
    created_at: datetime
    ok_count: int
    check_count: int
    error_count: int
    model_version: str
    disputed: bool


@dataclass(frozen=True, slots=True)
class PhonemeStat:
    """Aggregated verdict counts for one sound."""

    phoneme: str
    total: int
    ok: int
    check: int
    error: int


class ResultsRepository:
    """SQLAlchemy implementation."""

    def __init__(self, sessions: SessionFactory) -> None:
        self._sessions = sessions

    def add(
        self,
        run_id: str,
        item_id: str,
        text: str,
        model_version: str,
        result: dict[str, object],
        phonemes: list[PhonemeRow],
    ) -> None:
        """Persist a run with its phoneme rows in one transaction."""
        counts = {verdict: sum(1 for p in phonemes if p.verdict is verdict) for verdict in Verdict}
        with self._sessions.session() as session:
            run = AssessmentRun(
                id=run_id,
                item_id=item_id,
                text=text,
                model_version=model_version,
                ok_count=counts[Verdict.OK],
                check_count=counts[Verdict.CHECK],
                error_count=counts[Verdict.ERROR],
                result_json=json.dumps(result, ensure_ascii=False),
            )
            run.phonemes = [
                PhonemeResult(
                    word=p.word,
                    phoneme=p.phoneme,
                    verdict=p.verdict.value,
                    gop=p.gop,
                    visual=p.visual,
                    error_id=p.error_id,
                )
                for p in phonemes
            ]
            session.add(run)

    def get(self, run_id: str) -> dict[str, object]:
        """Full stored result of a run."""
        with self._sessions.session() as session:
            run = session.get(AssessmentRun, run_id)
            if run is None:
                raise NotFoundError(f"run {run_id} not found")
            payload: dict[str, object] = json.loads(run.result_json)
            return payload

    def dispute(self, run_id: str) -> None:
        """Mark a run as disputed by the learner ("Tôi nói đúng mà") for later calibration."""
        with self._sessions.session() as session:
            run = session.get(AssessmentRun, run_id)
            if run is None:
                raise NotFoundError(f"run {run_id} not found")
            run.disputed = True

    def recent(self, limit: int) -> list[RunSummary]:
        """Latest runs, newest first."""
        with self._sessions.session() as session:
            rows = session.scalars(
                select(AssessmentRun).order_by(AssessmentRun.created_at.desc()).limit(limit)
            ).all()
            return [
                RunSummary(
                    r.id,
                    r.item_id,
                    r.text,
                    r.created_at,
                    r.ok_count,
                    r.check_count,
                    r.error_count,
                    r.model_version,
                    r.disputed,
                )
                for r in rows
            ]

    def phoneme_stats(self) -> list[PhonemeStat]:
        """Verdict counts per sound over all runs (machine-measured progress)."""
        with self._sessions.session() as session:
            rows = session.execute(
                select(PhonemeResult.phoneme, PhonemeResult.verdict, func.count()).group_by(
                    PhonemeResult.phoneme, PhonemeResult.verdict
                )
            ).all()
        counts: dict[str, dict[str, int]] = {}
        for phoneme, verdict, count in rows:
            counts.setdefault(phoneme, {})[verdict] = int(count)
        return [
            PhonemeStat(
                phoneme,
                sum(by.values()),
                by.get(Verdict.OK.value, 0),
                by.get(Verdict.CHECK.value, 0),
                by.get(Verdict.ERROR.value, 0),
            )
            for phoneme, by in sorted(counts.items())
        ]
