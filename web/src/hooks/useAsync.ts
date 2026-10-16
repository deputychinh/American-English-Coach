'use client';

import { useCallback, useEffect, useState } from 'react';

import { AsyncStatus } from '@/enums/async-status.enum';
import type { AsyncResult, AsyncState } from '@/interfaces/hooks.interface';

/**
 * Runs a stable `load` on mount and whenever `reload` is called; a result that arrives after the
 * component unmounted (or after a newer request started) is discarded.
 */
export const useAsync = <T>(load: () => Promise<T>): AsyncResult<T> => {
  const [state, setState] = useState<AsyncState<T>>({
    status: AsyncStatus.Loading,
    data: null,
    error: null,
  });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let active = true;
    load()
      .then((data) => {
        if (active) setState({ status: AsyncStatus.Success, data, error: null });
      })
      .catch((error: unknown) => {
        if (active) {
          const message = error instanceof Error ? error.message : String(error);
          setState({ status: AsyncStatus.Error, data: null, error: message });
        }
      });
    return () => {
      active = false;
    };
  }, [load, tick]);

  const reload = useCallback(() => {
    setState((previous) => ({ ...previous, status: AsyncStatus.Loading, error: null }));
    setTick((value) => value + 1);
  }, []);
  return { ...state, reload };
};
