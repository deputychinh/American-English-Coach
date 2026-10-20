import type { PosteriorMatrix } from '@/interfaces/scoring.interface';

/** Index of the first maximum of one frame (numpy `argmax` semantics). */
export const frameArgmax = (matrix: PosteriorMatrix, frame: number): number => {
  const start = frame * matrix.vocab;
  let best = 0;
  let bestValue = -Infinity;
  for (let column = 0; column < matrix.vocab; column += 1) {
    const value = matrix.data[start + column] ?? -Infinity;
    if (value > bestValue) {
      bestValue = value;
      best = column;
    }
  }
  return best;
};

/** Greedy CTC: collapse repeated argmax columns and drop blanks (backend ctc_decoder.py). */
export const greedyDecode = (
  matrix: PosteriorMatrix,
  vocab: Record<string, number>,
  blankId: number,
): string[] => {
  const tokenById = new Map(Object.entries(vocab).map(([token, index]) => [index, token]));
  const decoded: string[] = [];
  let previous = -1;
  for (let frame = 0; frame < matrix.frames; frame += 1) {
    const column = frameArgmax(matrix, frame);
    if (column !== previous && column !== blankId) {
      const token = tokenById.get(column) ?? '';
      if (token && !token.startsWith('<')) decoded.push(token);
    }
    previous = column;
  }
  return decoded;
};
