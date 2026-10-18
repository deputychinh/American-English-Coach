'use client';

import { type ReactElement, type ReactNode, useEffect, useRef } from 'react';

import { IconButton } from '@/components/IconButton/IconButton';
import { SHEET_CLOSE_SHARE, SWIPE_FLICK_VELOCITY } from '@/constants/gesture.constant';
import { IconName } from '@/enums/icon-name.enum';
import { useCopy } from '@/hooks/useCopy';
import { useSwipe } from '@/hooks/useSwipe';
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
  const panelRef = useRef<HTMLDivElement>(null);

  // Drag the handle or the title bar down to close, like an iOS sheet: the panel follows the
  // finger, closes past a third of its height or on a flick, and springs back otherwise.
  const place = (dy: number, isAnimated: boolean): void => {
    const panel = panelRef.current;
    if (!panel) return;
    panel.style.transition = isAnimated ? '' : 'none';
    panel.style.transform = dy > 0 ? `translateY(${String(dy)}px)` : '';
  };
  const grip = useSwipe({
    onDrag: (dy) => place(dy, false),
    onDown: ({ dy, ms }) => {
      const height = panelRef.current?.offsetHeight ?? 0;
      if (dy > height * SHEET_CLOSE_SHARE || dy / Math.max(1, ms) > SWIPE_FLICK_VELOCITY) {
        onClose();
        return;
      }
      place(0, true);
    },
    onCancel: () => place(0, true),
  });

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
    if (!isOpen) place(0, true);
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
      <div ref={panelRef} className="sheet__panel">
        <div className="sheet__grip" {...grip}>
          <span className="sheet__handle" aria-hidden="true" />
          <header className="sheet__head">
            <h2 className="sheet__title">{title}</h2>
            <IconButton icon={IconName.Close} label={copy.common.close} onClick={onClose} />
          </header>
        </div>
        <div className="sheet__body">{isOpen ? children : null}</div>
      </div>
    </dialog>
  );
};
