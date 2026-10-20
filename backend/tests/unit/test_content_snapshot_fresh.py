import json

from app.eval.content_snapshot import OUT, build


def test_bundled_content_matches_the_api() -> None:
    # The offline app reads these files; regenerate with scripts/build_content_snapshot.py.
    for name, value in build().items():
        committed = json.loads((OUT / name).read_text(encoding="utf-8"))
        assert committed == value, f"{name} is stale"
