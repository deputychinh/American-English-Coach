"""Pilot tooling: export rows for labelling and measure precision from labels."""

from pathlib import Path

import pytest

from app.db.engine import SessionFactory, create_sqlite_engine
from app.enums import Verdict
from app.eval.pilot import (
    MIN_SUPPORT,
    export_rows,
    false_alarm_rate,
    format_report,
    precision_by_error,
    read_labels,
    write_csv,
)
from app.repositories.results_repository import PhonemeRow, ResultsRepository


def _row(phoneme: str, verdict: Verdict, error_id: str | None) -> PhonemeRow:
    return PhonemeRow("think", phoneme, verdict, -1.0, "unavailable", error_id)


def test_export_keeps_flagged_phones_and_a_sample_of_controls(tmp_path: Path) -> None:
    sessions = SessionFactory(create_sqlite_engine(tmp_path / "db.sqlite3"))
    results = ResultsRepository(sessions)
    for index in range(3):
        results.add(
            f"run-{index}",
            "pair:think-sink:0",
            "think",
            "m",
            {},
            [
                _row("TH", Verdict.CHECK, "th_to_t_s_f"),
                *[_row("IH", Verdict.OK, None) for _ in range(9)],
            ],
        )
    rows = export_rows(sessions)
    flagged = [r for r in rows if r["error_id"]]
    controls = [r for r in rows if not r["error_id"]]
    assert len(flagged) == 3
    assert len(controls) == 2  # every 10th ok phone out of 27
    assert set(rows[0]) == {
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
    }
    target = tmp_path / "pilot.csv"
    write_csv(rows, target)
    assert read_labels(target)[0]["label"] == ""


def test_precision_report_and_gate(tmp_path: Path) -> None:
    rows = [{"error_id": "th_to_t_s_f", "label": "wrong"} for _ in range(18)]
    rows += [{"error_id": "th_to_t_s_f", "label": "correct"} for _ in range(2)]
    rows += [{"error_id": "th_to_t_s_f", "label": "unsure"}]
    rows += [{"error_id": "final_p_dropped", "label": "wrong"} for _ in range(5)]
    rows += [{"error_id": "final_p_dropped", "label": "correct"} for _ in range(5)]
    rows += [{"error_id": "", "label": "correct"}]
    stats = precision_by_error(rows)
    assert [s.error_id for s in stats] == ["th_to_t_s_f", "final_p_dropped"]
    assert stats[0].precision == 0.9
    assert stats[0].passes_gate is True
    assert stats[1].precision == 0.5
    assert stats[1].passes_gate is False
    assert MIN_SUPPORT == 20
    assert false_alarm_rate(rows) == pytest.approx(7 / 30)
    report = format_report(stats, false_alarm_rate(rows))
    assert "th_to_t_s_f" in report
    assert "PASS" in report
    assert false_alarm_rate([]) is None

    bad = tmp_path / "bad.csv"
    bad.write_text("run_id,error_id,label\nr1,th_to_t_s_f,maybe\n", encoding="utf-8")
    with pytest.raises(ValueError, match="unknown label"):
        read_labels(bad)
