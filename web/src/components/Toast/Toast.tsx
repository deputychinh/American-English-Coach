'use client';

import {
  createContext,
  type ReactElement,
  type ReactNode,
  use,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';

import { Icon } from '@/components/Icon/Icon';
import { TOAST_DURATION_MS } from '@/constants/ui.constant';
import { IconName } from '@/enums/icon-name.enum';
import { useCopy } from '@/hooks/useCopy';
import type { ToastApi, ToastItem } from '@/interfaces/toast.interface';
import { cx } from '@/utils/cx.util';

import './Toast.css';

const ToastContext = createContext<ToastApi>({ show: () => undefined });

/** Access the non-blocking notification API. */
export const useToast = (): ToastApi => use(ToastContext);

interface ToastProviderProps {
  children: ReactNode;
}

/** Renders queued toasts above the tab bar; each dismisses itself after a few seconds. */
export const ToastProvider = ({ children }: ToastProviderProps): ReactElement => {
  const copy = useCopy();
  const [items, setItems] = useState<ToastItem[]>([]);
  const counterRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const show = useCallback(
    (message: string, tone: ToastItem['tone'] = 'info') => {
      counterRef.current += 1;
      const id = counterRef.current;
      setItems((current) => [...current.slice(-2), { id, message, tone }]);
      window.setTimeout(() => dismiss(id), TOAST_DURATION_MS);
    },
    [dismiss],
  );

  const api = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext value={api}>
      {children}
      <div className="toast" aria-live="polite" aria-atomic="false">
        {items.map((item) => (
          <div
            key={item.id}
            className={cx('toast__item', `toast__item--${item.tone}`)}
            role="status"
          >
            <Icon name={item.tone === 'success' ? IconName.Check : IconName.Info} />
            <span className="toast__message">{item.message}</span>
            <button
              type="button"
              className="toast__close"
              aria-label={copy.common.dismiss}
              onClick={() => dismiss(item.id)}
            >
              <Icon name={IconName.Close} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext>
  );
};
