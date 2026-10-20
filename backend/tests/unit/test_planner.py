"""Weekly-plan rules: local days, week buckets, streaks and the focus picks."""

from datetime import UTC, date, datetime

from app.domain.planner import (
    RunDay,
    SoundHistory,
    day_start_utc,
    local_date,
    pick_focus,
    streak_days,
    week_summary,
)
from app.enums import FocusReason

VIETNAM = 7 * 60
TODAY = date(2026, 10, 17)


def test_local_date_follows_the_learner_zone() -> None:
    late_evening_utc = datetime(2026, 10, 16, 18, 30, tzinfo=UTC)
    assert local_date(late_evening_utc, VIETNAM) == date(2026, 10, 17)
    assert local_date(late_evening_utc, 0) == date(2026, 10, 16)
    assert local_date(datetime(2026, 10, 16, 18, 30), VIETNAM) == date(2026, 10, 17)  # naive=UTC
    assert day_start_utc(date(2026, 10, 17), VIETNAM) == datetime(2026, 10, 16, 17, tzinfo=UTC)


def test_week_summary_is_seven_zero_filled_days_ending_today() -> None:
    runs = [
        RunDay(date(2026, 10, 17), 4, 0, 0),
        RunDay(date(2026, 10, 17), 3, 1, 0),
        RunDay(date(2026, 10, 15), 2, 2, 0),
        RunDay(date(2026, 10, 1), 9, 9, 9),  # outside the window
    ]
    week = week_summary(runs, TODAY)
    assert [d.day for d in week] == [date(2026, 10, n) for n in range(11, 18)]
    assert (week[-1].runs, week[-1].ok, week[-1].check) == (2, 7, 1)
    assert week[4].runs == 1
    assert sum(d.runs for d in week) == 3


def test_streak_counts_back_from_today_or_yesterday() -> None:
    assert streak_days(set(), TODAY) == 0
    assert streak_days({date(2026, 10, 17)}, TODAY) == 1
    three = {date(2026, 10, 17), date(2026, 10, 16), date(2026, 10, 15)}
    assert streak_days(three, TODAY) == 3
    # Today not practised yet: yesterday's streak still stands.
    assert streak_days({date(2026, 10, 16), date(2026, 10, 15)}, TODAY) == 2
    # One missed day is a rest day: it keeps the streak but does not count.
    assert streak_days({date(2026, 10, 17), date(2026, 10, 15)}, TODAY) == 2
    assert streak_days({date(2026, 10, 15), date(2026, 10, 14)}, TODAY) == 2
    # Two missed days in a row, or two rest days within a week, break it.
    assert streak_days({date(2026, 10, 17), date(2026, 10, 14)}, TODAY) == 1
    week = {date(2026, 10, 17), date(2026, 10, 15), date(2026, 10, 13), date(2026, 10, 12)}
    assert streak_days(week, TODAY) == 2
    # A week later another rest day is allowed again.
    later = {date(2026, 10, 17), date(2026, 10, 15)} | {date(2026, 10, d) for d in range(7, 15)}
    assert streak_days(later - {date(2026, 10, 8)}, TODAY) == 9


def test_focus_prefers_weak_sounds_then_review_then_new_without_repeats() -> None:
    histories = [
        SoundHistory("TH", 10, 3, date(2026, 10, 16)),  # weak 30 %
        SoundHistory("IH", 10, 6, date(2026, 10, 16)),  # weak 60 %
        SoundHistory("K", 10, 4, date(2026, 10, 16)),  # weak 40 %
        SoundHistory("NG", 10, 9, date(2026, 10, 10)),  # good, 7 days ago -> review
        SoundHistory("N", 2, 0, date(2026, 10, 16)),  # too few samples
        SoundHistory("S", 10, 10, date(2026, 10, 17)),  # good and fresh
    ]
    chart = ["IY", "IH", "TH", "DH", "S"]
    picks = pick_focus(histories, chart, TODAY)
    assert [(p.phoneme, p.reason) for p in picks] == [
        ("TH", FocusReason.WEAK),
        ("K", FocusReason.WEAK),
        ("NG", FocusReason.REVIEW),
    ]
    assert picks[0].ok_rate == 0.3
    assert picks[2].days_since == 7


def test_focus_fills_with_new_sounds_in_chart_order_for_a_beginner() -> None:
    picks = pick_focus([SoundHistory("IY", 1, 1, TODAY)], ["IY", "IH", "TH", "DH"], TODAY)
    assert [(p.phoneme, p.reason) for p in picks] == [
        ("IH", FocusReason.NEW),
        ("TH", FocusReason.NEW),
        ("DH", FocusReason.NEW),
    ]
    assert pick_focus([], [], TODAY) == []
