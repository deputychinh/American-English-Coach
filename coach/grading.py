"""Deterministic word alignment for dictation; never scores pronunciation."""
import re
import unicodedata


def tokens(text):
    normalized = unicodedata.normalize("NFKC", text).lower().replace("’", "'").replace("‘", "'")
    return re.findall(r"[a-z0-9]+(?:'[a-z0-9]+)*", normalized)


def grade_dictation(reference, answer, alternatives=None):
    candidates = [reference] + (alternatives or [])
    results = [_align(tokens(candidate), tokens(answer)) for candidate in candidates]
    return min(results, key=lambda item: item["distance"])


def _align(expected, actual):
    # Levenshtein alignment, preserving negation and word order.
    matrix = [[0] * (len(actual) + 1) for _ in range(len(expected) + 1)]
    for i in range(len(expected) + 1):
        matrix[i][0] = i
    for j in range(len(actual) + 1):
        matrix[0][j] = j
    for i, left in enumerate(expected, 1):
        for j, right in enumerate(actual, 1):
            matrix[i][j] = min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1,
                               matrix[i - 1][j - 1] + (left != right))
    i, j = len(expected), len(actual)
    aligned = []
    while i or j:
        if i and j and matrix[i][j] == matrix[i - 1][j - 1] + (expected[i - 1] != actual[j - 1]):
            aligned.append({"type": "match" if expected[i - 1] == actual[j - 1] else "substitution",
                            "expected": expected[i - 1], "actual": actual[j - 1]})
            i, j = i - 1, j - 1
        elif i and matrix[i][j] == matrix[i - 1][j] + 1:
            aligned.append({"type": "omission", "expected": expected[i - 1], "actual": ""})
            i -= 1
        else:
            aligned.append({"type": "insertion", "expected": "", "actual": actual[j - 1]})
            j -= 1
    aligned.reverse()
    distance = matrix[-1][-1]
    return {"score": round(max(0, 1 - distance / max(1, len(expected))) * 100),
            "correct": distance == 0, "distance": distance, "alignment": aligned,
            "errors": [part for part in aligned if part["type"] != "match"]}
