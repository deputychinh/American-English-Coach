"""Needleman-Wunsch alignment of expected and recognised phoneme sequences."""

from dataclasses import dataclass

from app.constants import ALIGN_DIFFERENT_CLASS_COST, ALIGN_GAP_COST, ALIGN_SAME_CLASS_COST
from app.domain.phoneme_inventory import phoneme_class
from app.enums import AlignmentOp


@dataclass(frozen=True, slots=True)
class AlignedPair:
    """One column of the alignment; `expected` or `actual` is empty for gaps."""

    op: AlignmentOp
    expected: str
    actual: str


def substitution_cost(expected: str, actual: str) -> float:
    """0 for identical symbols, lower within an articulatory class, 1 across classes."""
    if expected == actual:
        return 0.0
    expected_class, actual_class = phoneme_class(expected), phoneme_class(actual)
    if expected_class is not None and expected_class is actual_class:
        return ALIGN_SAME_CLASS_COST
    return ALIGN_DIFFERENT_CLASS_COST


class PhonemeAligner:
    """Global alignment with class-aware substitution costs (deterministic, no randomness)."""

    def align(self, expected: list[str], actual: list[str]) -> list[AlignedPair]:
        """Align two sequences and return one pair per alignment column."""
        matrix = self._fill(expected, actual)
        return self._traceback(matrix, expected, actual)

    @staticmethod
    def _fill(expected: list[str], actual: list[str]) -> list[list[float]]:
        rows, cols = len(expected) + 1, len(actual) + 1
        matrix = [[0.0] * cols for _ in range(rows)]
        for i in range(1, rows):
            matrix[i][0] = i * ALIGN_GAP_COST
        for j in range(1, cols):
            matrix[0][j] = j * ALIGN_GAP_COST
        for i in range(1, rows):
            for j in range(1, cols):
                diagonal = matrix[i - 1][j - 1] + substitution_cost(expected[i - 1], actual[j - 1])
                matrix[i][j] = min(
                    diagonal, matrix[i - 1][j] + ALIGN_GAP_COST, matrix[i][j - 1] + ALIGN_GAP_COST
                )
        return matrix

    @staticmethod
    def _traceback(
        matrix: list[list[float]], expected: list[str], actual: list[str]
    ) -> list[AlignedPair]:
        i, j = len(expected), len(actual)
        pairs: list[AlignedPair] = []
        while i > 0 or j > 0:
            if i > 0 and j > 0:
                diagonal = matrix[i - 1][j - 1] + substitution_cost(expected[i - 1], actual[j - 1])
                if matrix[i][j] == diagonal:
                    op = (
                        AlignmentOp.MATCH
                        if expected[i - 1] == actual[j - 1]
                        else AlignmentOp.SUBSTITUTION
                    )
                    pairs.append(AlignedPair(op, expected[i - 1], actual[j - 1]))
                    i, j = i - 1, j - 1
                    continue
            if i > 0 and matrix[i][j] == matrix[i - 1][j] + ALIGN_GAP_COST:
                pairs.append(AlignedPair(AlignmentOp.DELETION, expected[i - 1], ""))
                i -= 1
                continue
            pairs.append(AlignedPair(AlignmentOp.INSERTION, "", actual[j - 1]))
            j -= 1
        pairs.reverse()
        return pairs
