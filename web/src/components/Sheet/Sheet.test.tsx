import { fireEvent, render, screen } from '@testing-library/react';

import { Sheet } from './Sheet';

// jsdom has no PointerEvent: a MouseEvent named like one, with a pointer id, is enough here.
const pointer = (type: string, y: number): MouseEvent => {
  const event = new MouseEvent(type, { bubbles: true, clientX: 100, clientY: y });
  Object.defineProperty(event, 'pointerId', { value: 1 });
  return event;
};

const renderSheet = (onClose: () => void): HTMLElement => {
  render(
    <Sheet isOpen title="Chi tiết" onClose={onClose}>
      <p>Nội dung</p>
    </Sheet>,
  );
  return screen.getByRole('heading', { name: 'Chi tiết' });
};

const drag = (target: HTMLElement, dy: number): void => {
  fireEvent(target, pointer('pointerdown', 100));
  fireEvent(target, pointer('pointermove', 100 + dy));
  fireEvent(target, pointer('pointerup', 100 + dy));
};

describe('Sheet drag to close', () => {
  it('closes when the title bar is pulled down', () => {
    const onClose = vi.fn();
    drag(renderSheet(onClose), 160);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('stays open after a tiny drag and still lets the close button work', () => {
    const onClose = vi.fn();
    drag(renderSheet(onClose), 8);
    expect(onClose).not.toHaveBeenCalled();
    // The backdrop shares the label; the visible close button is the last one.
    const buttons = screen.getAllByRole('button', { name: 'Đóng' });
    fireEvent.click(buttons[buttons.length - 1] as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
