"""Builds the weekly plan of a profile from stored results and the sound chart."""

from datetime import UTC, datetime, timedelta

from app.domain.phoneme_inventory import ARPABET_IPA
from app.domain.planner import (
    STREAK_LOOKBACK_DAYS,
    WEEK_DAYS,
    RunDay,
    SoundHistory,
    day_start_utc,
    local_date,
    pick_focus,
    streak_days,
    week_summary,
)
from app.repositories.results_repository import ResultsRepository
from app.schemas.plan import PlanDay, PlanFocus, PlanResponse
from app.services.content_service import ContentService


class PlanService:
    """Reads aggregates, applies the planner rules, maps sounds to drills."""

    def __init__(self, results: ResultsRepository, content: ContentService) -> None:
        self._results = results
        self._content = content

    def plan(
        self,
        profile_id: str,
        tz_offset_minutes: int,
        goal_runs: int,
        now: datetime | None = None,
    ) -> PlanResponse:
        """The plan as of `now` (UTC) seen from the learner's time zone."""
        moment = now or datetime.now(UTC)
        today = local_date(moment, tz_offset_minutes)
        lookback = day_start_utc(today - timedelta(days=STREAK_LOOKBACK_DAYS), tz_offset_minutes)
        runs = [
            RunDay(local_date(r.created_at, tz_offset_minutes), r.ok, r.check, r.error)
            for r in self._results.runs_since(lookback, profile_id)
        ]
        week = week_summary(runs, today)
        streak = streak_days({r.day for r in runs}, today)
        histories = [
            SoundHistory(h.phoneme, h.total, h.ok, local_date(h.last_at, tz_offset_minutes))
            for h in self._results.phoneme_history(profile_id)
        ]
        chart = self._content.chart_phones()
        picks = pick_focus(histories, chart, today)
        return PlanResponse(
            today=today,
            goal_runs=goal_runs,
            runs_today=week[-1].runs if week else 0,
            streak_days=streak,
            week=[
                PlanDay(
                    date=d.day,
                    runs=d.runs,
                    ok=d.ok,
                    check=d.check,
                    error=d.error,
                    goal_met=d.runs >= goal_runs,
                )
                for d in week[-WEEK_DAYS:]
            ],
            focus=[
                PlanFocus(
                    phoneme=p.phoneme,
                    ipa=ARPABET_IPA.get(p.phoneme, "?"),
                    reason=p.reason,
                    sound_id=self._content.drill_id_of(p.phoneme),
                    total=p.total,
                    ok_rate=p.ok_rate,
                    days_since=p.days_since,
                )
                for p in picks
            ],
            practised_sounds=len(histories),
            total_sounds=len(chart),
        )
