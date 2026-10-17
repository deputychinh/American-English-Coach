"""Store and query assessment runs and per-phone results (scoped by learner profile)."""

import json
from dataclasses import dataclass
from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.db.engine import SessionFactory
from app.db.models import DEFAULT_PROFILE_ID, AssessmentRun, PhonemeResult
from app.enums import Verdict
from app.errors import NotFoundError


def aware_utc(value: datetime) -> datetime:
    """SQLite drops the offset; every timestamp we store is UTC, so put it back for the API."""
    return value if value.tzinfo is not None else value.replace(tzinfo=UTC)


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


@dataclass(frozen=True, slots=True)
class PhonemeHistory:
    """Per-sound totals plus when the sound was last practised (for the weekly plan)."""

    phoneme: str
    total: int
    ok: int
    check: int
    error: int
    last_at: datetime


@dataclass(frozen=True, slots=True)
class RunActivity:
    """What the plan needs from one run: when, and the verdict counts."""

    created_at: datetime
    ok: int
    check: int
    error: int


@dataclass(frozen=True, slots=True)
class ExportedRun:
    """A full run for export/import between coaches."""

    id: str
    item_id: str
    text: str
    model_version: str
    created_at: datetime
    disputed: bool
    result: dict[str, object]
    phonemes: list[PhonemeRow]


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
        profile_id: str = DEFAULT_PROFILE_ID,
    ) -> None:
        """Persist a run with its phoneme rows in one transaction."""
        with self._sessions.session() as session:
            session.add(
                _run_from(
                    ExportedRun(
                        run_id,
                        item_id,
                        text,
                        model_version,
                        datetime.now(UTC),
                        False,
                        result,
                        phonemes,
                    ),
                    profile_id,
                )
            )

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

    def recent(self, limit: int, profile_id: str = DEFAULT_PROFILE_ID) -> list[RunSummary]:
        """Latest runs of a profile, newest first."""
        with self._sessions.session() as session:
            rows = session.scalars(
                select(AssessmentRun)
                .where(AssessmentRun.profile_id == profile_id)
                .order_by(AssessmentRun.created_at.desc())
                .limit(limit)
            ).all()
            return [
                RunSummary(
                    r.id,
                    r.item_id,
                    r.text,
                    aware_utc(r.created_at),
                    r.ok_count,
                    r.check_count,
                    r.error_count,
                    r.model_version,
                    r.disputed,
                )
                for r in rows
            ]

    def count(self, profile_id: str = DEFAULT_PROFILE_ID) -> int:
        """Number of runs of a profile."""
        with self._sessions.session() as session:
            total = session.scalar(
                select(func.count()).where(AssessmentRun.profile_id == profile_id)
            )
            return int(total or 0)

    def phoneme_stats(self, profile_id: str = DEFAULT_PROFILE_ID) -> list[PhonemeStat]:
        """Verdict counts per sound over all runs of a profile (machine-measured progress)."""
        with self._sessions.session() as session:
            rows = session.execute(
                select(PhonemeResult.phoneme, PhonemeResult.verdict, func.count())
                .join(AssessmentRun, AssessmentRun.id == PhonemeResult.run_id)
                .where(AssessmentRun.profile_id == profile_id)
                .group_by(PhonemeResult.phoneme, PhonemeResult.verdict)
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

    def phoneme_history(self, profile_id: str = DEFAULT_PROFILE_ID) -> list[PhonemeHistory]:
        """Per-sound totals with the time of the last run containing that sound."""
        with self._sessions.session() as session:
            rows = session.execute(
                select(
                    PhonemeResult.phoneme,
                    PhonemeResult.verdict,
                    func.count(),
                    func.max(AssessmentRun.created_at),
                )
                .join(AssessmentRun, AssessmentRun.id == PhonemeResult.run_id)
                .where(AssessmentRun.profile_id == profile_id)
                .group_by(PhonemeResult.phoneme, PhonemeResult.verdict)
            ).all()
        counts: dict[str, dict[str, int]] = {}
        last: dict[str, datetime] = {}
        for phoneme, verdict, count, latest in rows:
            counts.setdefault(phoneme, {})[verdict] = int(count)
            when = aware_utc(_parse_timestamp(latest))
            if phoneme not in last or when > last[phoneme]:
                last[phoneme] = when
        return [
            PhonemeHistory(
                phoneme,
                sum(by.values()),
                by.get(Verdict.OK.value, 0),
                by.get(Verdict.CHECK.value, 0),
                by.get(Verdict.ERROR.value, 0),
                last[phoneme],
            )
            for phoneme, by in sorted(counts.items())
        ]

    def runs_since(
        self, since: datetime, profile_id: str = DEFAULT_PROFILE_ID
    ) -> list[RunActivity]:
        """Runs of a profile created at or after `since` (UTC), oldest first."""
        naive = since.astimezone(UTC).replace(tzinfo=None)
        with self._sessions.session() as session:
            rows = session.scalars(
                select(AssessmentRun)
                .where(AssessmentRun.profile_id == profile_id, AssessmentRun.created_at >= naive)
                .order_by(AssessmentRun.created_at)
            ).all()
            return [
                RunActivity(aware_utc(r.created_at), r.ok_count, r.check_count, r.error_count)
                for r in rows
            ]

    def export(self, profile_id: str) -> list[ExportedRun]:
        """Every run of a profile with its phoneme rows, oldest first."""
        with self._sessions.session() as session:
            rows = session.scalars(
                select(AssessmentRun)
                .options(selectinload(AssessmentRun.phonemes))
                .where(AssessmentRun.profile_id == profile_id)
                .order_by(AssessmentRun.created_at)
            ).all()
            return [
                ExportedRun(
                    r.id,
                    r.item_id,
                    r.text,
                    r.model_version,
                    aware_utc(r.created_at),
                    r.disputed,
                    json.loads(r.result_json),
                    [
                        PhonemeRow(
                            p.word, p.phoneme, Verdict(p.verdict), p.gop, p.visual, p.error_id
                        )
                        for p in r.phonemes
                    ],
                )
                for r in rows
            ]

    def import_runs(self, profile_id: str, runs: list[ExportedRun]) -> tuple[int, int]:
        """Insert exported runs into a profile; runs whose id already exists are skipped."""
        imported = skipped = 0
        with self._sessions.session() as session:
            for run in runs:
                if session.get(AssessmentRun, run.id) is not None:
                    skipped += 1
                    continue
                session.add(_run_from(run, profile_id))
                imported += 1
        return imported, skipped


def _run_from(run: ExportedRun, profile_id: str) -> AssessmentRun:
    counts = {verdict: sum(1 for p in run.phonemes if p.verdict is verdict) for verdict in Verdict}
    row = AssessmentRun(
        id=run.id,
        profile_id=profile_id,
        item_id=run.item_id,
        text=run.text,
        model_version=run.model_version,
        created_at=run.created_at.astimezone(UTC).replace(tzinfo=None),
        ok_count=counts[Verdict.OK],
        check_count=counts[Verdict.CHECK],
        error_count=counts[Verdict.ERROR],
        result_json=json.dumps(run.result, ensure_ascii=False),
        disputed=run.disputed,
    )
    row.phonemes = [
        PhonemeResult(
            word=p.word,
            phoneme=p.phoneme,
            verdict=p.verdict.value,
            gop=p.gop,
            visual=p.visual,
            error_id=p.error_id,
        )
        for p in run.phonemes
    ]
    return row


def _parse_timestamp(value: object) -> datetime:
    """`max()` over a DateTime column comes back as text from SQLite."""
    if isinstance(value, datetime):
        return value
    return datetime.fromisoformat(str(value))
