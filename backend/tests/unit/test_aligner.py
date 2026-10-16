from app.domain.aligner import PhonemeAligner, substitution_cost


def ops(expected: list[str], actual: list[str]) -> list[tuple[str, str, str]]:
    return [(p.op.value, p.expected, p.actual) for p in PhonemeAligner().align(expected, actual)]


def test_identical_sequences_match_everywhere() -> None:
    assert ops(["TH", "IH", "NG", "K"], ["TH", "IH", "NG", "K"]) == [
        ("match", "TH", "TH"), ("match", "IH", "IH"), ("match", "NG", "NG"), ("match", "K", "K"),
    ]  # fmt: skip


def test_substitution_th_to_t_is_reported_in_place() -> None:
    assert ops(["TH", "IH", "NG", "K"], ["T", "IH", "NG", "K"])[0] == ("substitution", "TH", "T")


def test_dropped_final_consonant_is_a_deletion() -> None:
    assert ops(["S", "T", "AA", "P"], ["S", "T", "AA"])[-1] == ("deletion", "P", "")


def test_added_vowel_after_final_consonant_is_an_insertion() -> None:
    assert ops(["S", "T", "AA", "P"], ["S", "T", "AA", "P", "AH"])[-1] == ("insertion", "", "AH")


def test_same_class_substitution_is_cheaper_than_cross_class() -> None:
    assert substitution_cost("TH", "S") < substitution_cost("TH", "AA")
    assert substitution_cost("TH", "TH") == 0.0
    assert substitution_cost("TH", "?") == 1.0


def test_empty_sequences_are_handled() -> None:
    assert ops([], []) == []
    assert ops(["P"], []) == [("deletion", "P", "")]
    assert ops([], ["P"]) == [("insertion", "", "P")]
