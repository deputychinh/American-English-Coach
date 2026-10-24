"""Run the V6 acceptance check against the configured chat model (plan v2 §8).

Sends each sentence of app/resources/feedback_eval.json (50 with one labelled error, 10 without)
as text to the content-feedback service, then reports precision, recall, false alarms on clean
sentences and pronunciation remarks in the raw replies. Exits 1 below precision 0.8.

The provider and key come from COACH_LLM_PROVIDER / COACH_LLM_API_KEY (environment or .env);
the key is never printed. The report goes to data/eval/content_feedback.json.
Run: `make eval-feedback` or `uv run python scripts/eval_content_feedback.py [--limit N]`.
"""

import argparse
import json
import sys
from dataclasses import asdict
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config import Settings
from app.container import AppContainer
from app.eval.feedback_eval import load_items, score

ROOT = Path(__file__).resolve().parents[2]
REPORT = ROOT / "data" / "eval" / "content_feedback.json"


def main() -> int:
    """Score the configured model on the labelled sentences; 0 when precision reaches 0.8."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--limit", type=int, default=0, help="only the first N sentences")
    args = parser.parse_args()
    settings = Settings()
    if not settings.tutor_enabled:
        print("set COACH_LLM_PROVIDER and COACH_LLM_API_KEY first", file=sys.stderr)
        return 2
    service = AppContainer(settings=settings).content_feedback
    items = load_items()[: args.limit or None]
    replies: dict[str, dict[str, Any]] = {}
    for index, item in enumerate(items, start=1):
        replies[item.id] = service.reply(item.text)
        print(f"{index}/{len(items)} {item.id}", file=sys.stderr)
    report = score(items, replies)
    summary = {"model": service.model, **asdict(report)}
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(
        json.dumps({**summary, "replies": replies}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(summary, indent=2))
    return 0 if report.passed else 1


if __name__ == "__main__":
    raise SystemExit(main())
