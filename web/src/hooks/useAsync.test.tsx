import { act, renderHook, waitFor } from '@testing-library/react';

import { AsyncStatus } from '@/enums/async-status.enum';

import { useAsync } from './useAsync';

describe('useAsync', () => {
  it('loads, exposes errors and reloads', async () => {
    let calls = 0;
    const load = vi.fn(() => {
      calls += 1;
      return calls === 1 ? Promise.reject(new Error('first')) : Promise.resolve('second');
    });
    const { result } = renderHook(() => useAsync(load));
    expect(result.current.status).toBe(AsyncStatus.Loading);
    await waitFor(() => expect(result.current.status).toBe(AsyncStatus.Error));
    expect(result.current.error).toBe('first');
    act(() => result.current.reload());
    await waitFor(() => expect(result.current.data).toBe('second'));
    expect(result.current.status).toBe(AsyncStatus.Success);
  });
});
