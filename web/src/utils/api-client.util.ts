import createClient, { type Client } from 'openapi-fetch';

import type { ApiClientOptions } from '@/interfaces/api-client-options.interface';
import { redirectToApiBase, storedApiBaseUrl } from '@/utils/api-base.util';

const fetchWithTimeout =
  (timeoutMs: number) =>
  (request: Request): Promise<Response> => {
    const target = redirectToApiBase(request, storedApiBaseUrl());
    return fetch(target, {
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(timeoutMs)]),
    });
  };

/** Typed client for one generated OpenAPI `paths` type; every request gives up after `timeoutMs`. */
export const createApiClient = <Paths extends object>({
  baseUrl,
  timeoutMs,
}: ApiClientOptions): Client<Paths> =>
  createClient<Paths>({ baseUrl, fetch: fetchWithTimeout(timeoutMs) });
