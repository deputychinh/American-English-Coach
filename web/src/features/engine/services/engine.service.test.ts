import { StorageKey } from '@/enums/storage-key.enum';

import { modelSource } from './engine.service';

const fetchMock = vi.fn<typeof fetch>();

describe('modelSource', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    localStorage.setItem(StorageKey.DeviceToken, JSON.stringify('tok'));
    localStorage.setItem(StorageKey.ApiBaseUrl, JSON.stringify('http://mac.local:8765'));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
    localStorage.clear();
  });

  it('reads the manifest from the paired server and keeps the token for the download', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ files: { 'w2v.mm8.onnx': { bytes: 1, sha256: 'abc' } } })),
    );
    const source = await modelSource();
    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://mac.local:8765/api/v1/models/manifest');
    expect(source).toEqual({
      url: 'http://mac.local:8765/api/v1/models/w2v.mm8.onnx',
      file: { bytes: 1, sha256: 'abc' },
      headers: { 'X-Coach-Token': 'tok' },
    });
  });

  it('returns null when the server has no exported model', async () => {
    fetchMock.mockResolvedValue(new Response('{}', { status: 404 }));
    expect(await modelSource()).toBeNull();
  });
});
