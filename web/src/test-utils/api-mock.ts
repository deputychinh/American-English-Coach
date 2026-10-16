import { vi } from 'vitest';

type Handler = (url: URL, init: RequestInit | undefined) => Response | Promise<Response>;

export const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': status >= 400 ? 'application/problem+json' : 'application/json' },
  });

/** Routes fetch calls by pathname; unmatched calls fail loudly so tests never hit the network. */
export const mockApi = (routes: Record<string, Handler>): ReturnType<typeof vi.fn> => {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const absolute = typeof input === 'string' ? new URL(input, 'http://localhost') : input;
    const request = absolute instanceof Request ? absolute : new Request(absolute, init);
    const url = new URL(request.url, 'http://localhost');
    const handler = routes[url.pathname];
    if (!handler) throw new Error(`unmocked ${request.method} ${url.pathname}`);
    return handler(url, init ?? { method: request.method, body: await request.blob() });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};
