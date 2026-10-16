"""Goodness of Pronunciation from CTC posteriors: forced alignment, segments and scores."""

from dataclasses import dataclass

import numpy as np
from numpy.typing import NDArray

from app.domain.phoneme_inventory import ARPABET, UNKNOWN, arpabet_variants

NEG_INF = -1e9
# A label state may be entered from the label two states back (the blank between is skipped).
SKIP = 2


@dataclass(frozen=True, slots=True)
class PhoneSegment:
    """Where an expected phone sits in the audio and how well the model supports it."""

    symbol: str
    start_frame: int
    end_frame: int
    gop: float


class GopScorer:
    """Merges model tokens into the 39-phone inventory and runs CTC Viterbi forced alignment."""

    def __init__(self, vocab: dict[str, int], blank_id: int) -> None:
        self._blank_id = blank_id
        self._columns: dict[str, list[int]] = {
            symbol: [vocab[token] for token in arpabet_variants(symbol) if token in vocab]
            for symbol in ARPABET
        }
        self._known = [symbol for symbol in ARPABET if self._columns[symbol]]

    def merged_log_probs(self, log_probs: NDArray[np.float32]) -> dict[str, NDArray[np.float64]]:
        """Per-frame log probability of each phone = log-sum-exp over its token variants."""
        merged: dict[str, NDArray[np.float64]] = {}
        for symbol in self._known:
            columns = log_probs[:, self._columns[symbol]].astype(np.float64)
            peak = columns.max(axis=1)
            merged[symbol] = peak + np.log(np.exp(columns - peak[:, None]).sum(axis=1))
        return merged

    def score(self, log_probs: NDArray[np.float32], expected: list[str]) -> list[PhoneSegment]:
        """Force-align the expected phones and score each one (GOP: 0 is best, lower is worse)."""
        if not expected or log_probs.shape[0] == 0:
            return []
        merged = self.merged_log_probs(log_probs)
        emissions = self._emissions(log_probs, merged, expected)
        boundaries = self._viterbi(emissions)
        # The blank competes too: a phone forced into silence (dropped final consonant) must not
        # score well just because every other phone is equally unlikely there.
        competitor = np.maximum(
            np.max(np.stack(list(merged.values())), axis=0),
            log_probs[:, self._blank_id].astype(np.float64),
        )
        segments: list[PhoneSegment] = []
        for index, symbol in enumerate(expected):
            start, end = boundaries[index]
            target = emissions[start:end, index + 1].mean()
            best = competitor[start:end].mean()
            gop = float(min(0.0, target - best)) if symbol != UNKNOWN else 0.0
            segments.append(PhoneSegment(symbol, start, end, round(gop, 3)))
        return segments

    def _emissions(
        self,
        log_probs: NDArray[np.float32],
        merged: dict[str, NDArray[np.float64]],
        expected: list[str],
    ) -> NDArray[np.float64]:
        """Column 0 is the blank; column i+1 the i-th expected phone (unknown → blank-like)."""
        frames = log_probs.shape[0]
        emissions = np.full((frames, len(expected) + 1), NEG_INF)
        emissions[:, 0] = log_probs[:, self._blank_id]
        for index, symbol in enumerate(expected):
            emissions[:, index + 1] = merged.get(symbol, emissions[:, 0])
        return emissions

    @staticmethod
    def _viterbi(emissions: NDArray[np.float64]) -> list[tuple[int, int]]:
        """CTC forced alignment over `blank p1 blank p2 … blank`; returns frame spans per phone."""
        frames, labels = emissions.shape[0], emissions.shape[1] - 1
        states = 2 * labels + 1
        score = np.full((frames, states), NEG_INF)
        back = np.zeros((frames, states), dtype=np.int64)
        emission_of = [0 if s % 2 == 0 else (s + 1) // 2 for s in range(states)]
        score[0, 0] = emissions[0, 0]
        if states > 1:
            score[0, 1] = emissions[0, 1]
        for t in range(1, frames):
            for s in range(states):
                candidates = [(score[t - 1, s], s)]
                if s >= 1:
                    candidates.append((score[t - 1, s - 1], s - 1))
                if s >= SKIP and s % 2 == 1:
                    candidates.append((score[t - 1, s - SKIP], s - SKIP))
                best_score, best_state = max(candidates)
                score[t, s] = best_score + emissions[t, emission_of[s]]
                back[t, s] = best_state
        state = _final_state(score[-1], states)
        path = [state]
        for t in range(frames - 1, 0, -1):
            state = int(back[t, state])
            path.append(state)
        path.reverse()
        return _spans(path, labels)


def _final_state(last: NDArray[np.float64], states: int) -> int:
    """The path may end on the last label or on the trailing blank; take the better one."""
    if states == 1:
        return 0
    return states - 1 if last[states - 1] >= last[states - 2] else states - 2


def _spans(path: list[int], labels: int) -> list[tuple[int, int]]:
    """Frame span of each label state along the Viterbi path (phones never get an empty span)."""
    spans: list[tuple[int, int]] = []
    for label in range(1, labels + 1):
        state = 2 * label - 1
        frames = [t for t, s in enumerate(path) if s == state]
        if frames:
            spans.append((frames[0], frames[-1] + 1))
        else:
            anchor = spans[-1][1] if spans else 0
            spans.append((anchor, min(anchor + 1, len(path))))
    return spans
