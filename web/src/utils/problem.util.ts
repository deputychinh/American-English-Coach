import type { ProblemDetails } from '@/interfaces/practice.interface';

const isProblem = (value: unknown): value is ProblemDetails =>
  typeof value === 'object' && value !== null && ('detail' in value || 'title' in value);

/** Human message from an openapi-fetch `error` body (RFC 9457) or a thrown Error. */
export const problemMessage = (error: unknown, fallback: string): string => {
  if (isProblem(error)) return error.detail ?? error.title ?? fallback;
  if (error instanceof Error) return error.message || fallback;
  return fallback;
};

/** Machine code of a problem body, when present. */
export const problemCode = (error: unknown): string | undefined =>
  isProblem(error) ? error.code : undefined;
