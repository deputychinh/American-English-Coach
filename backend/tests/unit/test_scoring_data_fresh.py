import json

from app.eval.scoring_data import OUT, build


def test_committed_scoring_data_matches_the_sources() -> None:
    # The in-app scorer reads these files; regenerate with scripts/build_scoring_data.py.
    for name, value in build().items():
        committed = json.loads((OUT / name).read_text(encoding="utf-8"))
        assert committed == json.loads(json.dumps(value)), f"{name} is stale"
