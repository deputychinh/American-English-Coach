import {
  ALIGN_DIFFERENT_CLASS_COST,
  ALIGN_GAP_COST,
  ALIGN_SAME_CLASS_COST,
} from '@/constants/scoring.constant';
import type { AlignedPair, PhoneInventory } from '@/interfaces/scoring.interface';
import { phonemeClass } from '@/utils/phoneme.util';

/** 0 for identical symbols, lower within an articulatory class, 1 across classes. */
export const substitutionCost = (
  expected: string,
  actual: string,
  inventory: PhoneInventory,
): number => {
  if (expected === actual) return 0;
  const expectedClass = phonemeClass(expected, inventory);
  if (expectedClass !== null && expectedClass === phonemeClass(actual, inventory)) {
    return ALIGN_SAME_CLASS_COST;
  }
  return ALIGN_DIFFERENT_CLASS_COST;
};

/** Needleman-Wunsch with class-aware costs (backend aligner.py, same tie-breaking). */
export const alignPhones = (
  expected: string[],
  actual: string[],
  inventory: PhoneInventory,
): AlignedPair[] => {
  const rows = expected.length + 1;
  const cols = actual.length + 1;
  const matrix = new Float64Array(rows * cols);
  const at = (i: number, j: number): number => matrix[i * cols + j] ?? 0;
  const cost = (i: number, j: number): number =>
    substitutionCost(expected[i - 1] ?? '', actual[j - 1] ?? '', inventory);
  for (let i = 1; i < rows; i += 1) matrix[i * cols] = i * ALIGN_GAP_COST;
  for (let j = 1; j < cols; j += 1) matrix[j] = j * ALIGN_GAP_COST;
  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      matrix[i * cols + j] = Math.min(
        at(i - 1, j - 1) + cost(i, j),
        at(i - 1, j) + ALIGN_GAP_COST,
        at(i, j - 1) + ALIGN_GAP_COST,
      );
    }
  }
  const pairs: AlignedPair[] = [];
  let i = expected.length;
  let j = actual.length;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && at(i, j) === at(i - 1, j - 1) + cost(i, j)) {
      const op = expected[i - 1] === actual[j - 1] ? 'match' : 'substitution';
      pairs.push({ op, expected: expected[i - 1] ?? '', actual: actual[j - 1] ?? '' });
      i -= 1;
      j -= 1;
    } else if (i > 0 && at(i, j) === at(i - 1, j) + ALIGN_GAP_COST) {
      pairs.push({ op: 'deletion', expected: expected[i - 1] ?? '', actual: '' });
      i -= 1;
    } else {
      pairs.push({ op: 'insertion', expected: '', actual: actual[j - 1] ?? '' });
      j -= 1;
    }
  }
  return pairs.reverse();
};
