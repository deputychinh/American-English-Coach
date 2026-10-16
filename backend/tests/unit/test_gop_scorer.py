import numpy as np

from app.domain.ctc_decoder import greedy_decode
from app.domain.gop_scorer import GopScorer
from tests.fakes import VOCAB, posteriors_for

BLANK = VOCAB["<pad>"]


def test_forced_alignment_finds_each_phone_in_order_with_good_gop() -> None:
    scorer = GopScorer(VOCAB, BLANK)
    segments = scorer.score(posteriors_for(["θ", "ɪ", "ŋ", "k"]), ["TH", "IH", "NG", "K"])
    assert [s.symbol for s in segments] == ["TH", "IH", "NG", "K"]
    assert all(s.end_frame > s.start_frame for s in segments)
    assert all(segments[i].end_frame <= segments[i + 1].start_frame for i in range(3))
    assert all(s.gop > -0.5 for s in segments)


def test_substituted_phone_gets_a_low_gop_while_others_stay_high() -> None:
    scorer = GopScorer(VOCAB, BLANK)
    segments = scorer.score(posteriors_for(["t", "ɪ", "ŋ", "k"]), ["TH", "IH", "NG", "K"])
    assert segments[0].gop < -5
    assert all(s.gop > -0.5 for s in segments[1:])


def test_unknown_expected_phone_is_neutral() -> None:
    scorer = GopScorer(VOCAB, BLANK)
    segments = scorer.score(posteriors_for(["t"]), ["?"])
    assert segments[0].gop == 0.0


def test_empty_inputs_give_no_segments() -> None:
    scorer = GopScorer(VOCAB, BLANK)
    assert scorer.score(posteriors_for(["t"]), []) == []
    assert scorer.score(np.zeros((0, len(VOCAB)), dtype=np.float32), ["T"]) == []


def test_merged_log_probs_sum_token_variants() -> None:
    scorer = GopScorer(VOCAB, BLANK)
    merged = scorer.merged_log_probs(posteriors_for(["ɾ"]))
    assert merged["T"].max() > -0.1  # the flap counts as T


def test_greedy_decode_collapses_repeats_and_blanks() -> None:
    assert greedy_decode(posteriors_for(["θ", "θ", "ɪ"]), VOCAB, BLANK) == ["θ", "θ", "ɪ"]
    assert greedy_decode(posteriors_for(["s"], gap=0), VOCAB, BLANK) == ["s"]
