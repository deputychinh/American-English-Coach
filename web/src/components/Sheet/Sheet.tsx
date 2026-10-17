'use client';

import { type ReactElement, type ReactNode, useEffect, useRef } from 'react';

import { IconButton } from '@/components/IconButton/IconButton';
import { IconName } from '@/enums/icon-name.enum';
import { useCopy } from '@/hooks/useCopy';
import { cx } from '@/utils/cx.util';

import './Sheet.css';

interface SheetProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Half-height panel with a clear backdrop, for use over the live camera. */
  isHalf?: boolean;
}

/** Bottom sheet on phones, centred panel on wide screens; the native dialog traps focus and Esc. */
export const Sheet = ({
  isOpen,
  title,
  onClose,
  children,
  isHalf = false,
}: SheetProps): ReactElement => {
  const copy = useCopy();
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const canModal = typeof dialog.showModal === 'function';
    if (isOpen && !dialog.open) {
      if (canModal) dialog.showModal();
      else dialog.setAttribute('open', '');
    } else if (!isOpen && dialog.open) {
      if (canModal) dialog.close();
      else dialog.removeAttribute('open');
    }
  }, [isOpen]);

  return (
    <dialog
      ref={ref}
      className={cx('sheet', isHalf && 'sheet--half')}
      aria-label={title}
      onClose={onClose}
    >
      <button
        type="button"
        className="sheet__backdrop"
        aria-label={copy.common.close}
        tabIndex={-1}
        onClick={onClose}
      />
      <div className="sheet__panel">
        <span className="sheet__handle" aria-hidden="true" />
        <header className="sheet__head">
          <h2 className="sheet__title">{title}</h2>
          <IconButton icon={IconName.Close} label={copy.common.close} onClick={onClose} />
        </header>
        <div className="sheet__body">{isOpen ? children : null}</div>
      </div>
    </dialog>
  );
};
