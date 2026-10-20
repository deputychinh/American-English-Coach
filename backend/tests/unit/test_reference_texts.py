from app.eval.reference_texts import reference_texts


def test_every_played_text_is_listed_once() -> None:
    texts = reference_texts()
    assert len(texts) == len(set(texts)) >= 600
    # chart example, drill word, minimal pair word, sentence and a listening stress word
    for text in ("see", "think", "sink", "Please keep the green tea.", "about"):
        assert text in texts
