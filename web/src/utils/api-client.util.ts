import createClient, { type Client } from 'openapi-fetch';

import type { ApiClientOptions } from '@/interfaces/api-client-options.interface';
import {
  noteUnauthorized,
  redirectToApiBase,
  storedApiBaseUrl,
  withClientHeaders,
} from '@/utils/api-base.util';

const fetchWithTimeout =
  (timeoutMs: number) =>
  async (request: Request): Promise<Response> => {
    const target = withClientHeaders(await redirectToApiBase(request, storedApiBaseUrl()));
    const response = await fetch(target, {
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(timeoutMs)]),
    });
    return noteUnauthorized(response);
  };

/** Typed client for one generated OpenAPI `paths` type; every request gives up after `timeoutMs`. */
export const createApiClient = <Paths extends object>({
  baseUrl,
  timeoutMs,
}: ApiClientOptions): Client<Paths> =>
  createClient<Paths>({ baseUrl, fetch: fetchWithTimeout(timeoutMs) });
