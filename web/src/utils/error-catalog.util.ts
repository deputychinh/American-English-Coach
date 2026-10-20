import type { AlignmentOp, KnownError } from '@/interfaces/scoring.interface';

/** Vietnamese learner error catalogue (port of backend error_catalog.py). */

/** Highest priority first; the sort is stable like Python's. */
export const sortErrors = (errors: KnownError[]): KnownError[] =>
  [...errors].sort((a, b) => a.priority - b.priority);

/** Highest-priority known error realised by one alignment column, or null. */
export const findKnownError = (
  sorted: KnownError[],
  column: { expected: string; heard: string; op: AlignmentOp; isFinal: boolean },
): KnownError | null =>
  sorted.find((error) => {
    if (column.expected !== error.expected || column.op !== error.kind) return false;
    if (error.final_only && !column.isFinal) return false;
    return column.op === 'deletion' || error.heard.includes(column.heard);
  }) ?? null;
