"""Greedy CTC decoding of the recogniser output into token strings."""

import numpy as np
from numpy.typing import NDArray


def greedy_decode(
    log_probs: NDArray[np.float32], vocab: dict[str, int], blank_id: int
) -> list[str]:
    """Collapse repeated argmax columns and drop blanks (standard CTC best path)."""
    tokens_by_id = {index: token for token, index in vocab.items()}
    best = log_probs.argmax(axis=1)
    decoded: list[str] = []
    previous = -1
    for column in best.tolist():
        if column not in (previous, blank_id):
            token = tokens_by_id.get(column, "")
            if token and not token.startswith("<"):
                decoded.append(token)
        previous = column
    return decoded
