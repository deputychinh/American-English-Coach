import type { ProblemDetails } from '@/interfaces/practice.interface';
import { getCopy } from '@/locales';

const isProblem = (value: unknown): value is ProblemDetails =>
  typeof value === 'object' && value !== null && ('detail' in value || 'title' in value);

/** Human message from an openapi-fetch `error` body (RFC 9457) or a thrown Error. */
export const problemMessage = (error: unknown, fallback: string): string => {
  // The pairing 401 is phrased for the learner here, not by the server.
  if (isProblem(error) && error.code === 'UNAUTHORIZED') return getCopy().unauthorized.message;
  if (isProblem(error) && error.code && error.code in getCopy().practice.problems)
    return getCopy().practice.problems[
      error.code as keyof ReturnType<typeof getCopy>['practice']['problems']
    ];
  if (isProblem(error)) return error.detail ?? error.title ?? fallback;
  if (error instanceof Error) return error.message || fallback;
  return fallback;
};

/** Machine code of a problem body, when present. */
export const problemCode = (error: unknown): string | undefined =>
  isProblem(error) ? error.code : undefined;
