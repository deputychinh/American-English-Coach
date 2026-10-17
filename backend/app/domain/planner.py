"""Weekly plan from measured results: what to practise today, streaks and the last seven days.

Pure functions over small records so the rules are testable without a database. Every rule is
deliberately simple and explainable to the learner ("yếu", "ôn lại", "mới"); the plan proposes,
the learner decides.
"""

from collections.abc import Iterable
from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta

from app.enums import FocusReason

MIN_SAMPLES = 3
WEAK_OK_RATE = 0.7
REVIEW_AFTER_DAYS = 3
FOCUS_LIMIT = 3
WEAK_LIMIT = 2
WEEK_DAYS = 7
STREAK_LOOKBACK_DAYS = 400


@dataclass(frozen=True, slots=True)
class SoundHistory:
    """What we know about one sound for one learner."""

    phoneme: str
    total: int
    ok: int
    last_day: date

    @property
    def ok_rate(self) -> float:
        """Share of `ok` verdicts (0 when nothing was measured)."""
        return self.ok / self.total if self.total else 0.0


@dataclass(frozen=True, slots=True)
class RunDay:
    """One run reduced to its local day and verdict counts."""

    day: date
    ok: int
    check: int
    error: int


@dataclass(frozen=True, slots=True)
class DaySummary:
    """Totals of one local day."""

    day: date
    runs: int
    ok: int
    check: int
    error: int


@dataclass(frozen=True, slots=True)
class FocusPick:
    """A proposed sound with the reason the learner will read."""

    phoneme: str
    reason: FocusReason
    total: int
    ok_rate: float | None
    days_since: int | None


def local_date(moment: datetime, tz_offset_minutes: int) -> date:
    """Calendar day of a UTC instant in the learner's zone (offset east of UTC in minutes)."""
    aware = moment if moment.tzinfo is not None else moment.replace(tzinfo=UTC)
    return (aware.astimezone(UTC) + timedelta(minutes=tz_offset_minutes)).date()


def day_start_utc(day: date, tz_offset_minutes: int) -> datetime:
    """UTC instant at which `day` begins in the learner's zone."""
    midnight = datetime(day.year, day.month, day.day, tzinfo=UTC)
    return midnight - timedelta(minutes=tz_offset_minutes)


def week_summary(runs: Iterable[RunDay], today: date) -> list[DaySummary]:
    """The last seven local days ending today, oldest first, zero-filled."""
    first = today - timedelta(days=WEEK_DAYS - 1)
    buckets = {first + timedelta(days=i): [0, 0, 0, 0] for i in range(WEEK_DAYS)}
    for run in runs:
        bucket = buckets.get(run.day)
        if bucket is None:
            continue
        bucket[0] += 1
        bucket[1] += run.ok
        bucket[2] += run.check
        bucket[3] += run.error
    return [DaySummary(day, *counts) for day, counts in sorted(buckets.items())]


def streak_days(practised: set[date], today: date) -> int:
    """Consecutive practised days ending today, or ending yesterday if today is still open."""
    cursor = today if today in practised else today - timedelta(days=1)
    streak = 0
    while cursor in practised:
        streak += 1
        cursor -= timedelta(days=1)
    return streak


def pick_focus(
    histories: list[SoundHistory], chart_order: list[str], today: date, limit: int = FOCUS_LIMIT
) -> list[FocusPick]:
    """Up to `limit` sounds: weak ones first, then one due for review, then untried sounds."""
    measured = [h for h in histories if h.total >= MIN_SAMPLES]
    weak = sorted(
        (h for h in measured if h.ok_rate < WEAK_OK_RATE), key=lambda h: (h.ok_rate, -h.total)
    )
    review = sorted(
        (
            h
            for h in measured
            if h.ok_rate >= WEAK_OK_RATE and (today - h.last_day).days >= REVIEW_AFTER_DAYS
        ),
        key=lambda h: (today - h.last_day).days,
        reverse=True,
    )
    practised = {h.phoneme for h in histories}
    new = [p for p in chart_order if p not in practised]

    picks: list[FocusPick] = []
    picks.extend(_pick(h, FocusReason.WEAK, today) for h in weak[:WEAK_LIMIT])
    picks.extend(_pick(h, FocusReason.REVIEW, today) for h in review[:1])
    picks.extend(FocusPick(p, FocusReason.NEW, 0, None, None) for p in new)
    picks.extend(_pick(h, FocusReason.WEAK, today) for h in weak[WEAK_LIMIT:])
    picks.extend(_pick(h, FocusReason.REVIEW, today) for h in review[1:])
    seen: set[str] = set()
    unique: list[FocusPick] = []
    for pick in picks:
        if pick.phoneme in seen:
            continue
        seen.add(pick.phoneme)
        unique.append(pick)
    return unique[:limit]


def _pick(history: SoundHistory, reason: FocusReason, today: date) -> FocusPick:
    return FocusPick(
        history.phoneme,
        reason,
        history.total,
        round(history.ok_rate, 3),
        (today - history.last_day).days,
    )
