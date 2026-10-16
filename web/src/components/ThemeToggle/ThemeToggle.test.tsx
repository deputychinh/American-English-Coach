import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ThemeToggle } from './ThemeToggle';

describe('ThemeToggle', () => {
  it('flips data-theme on <html> and stores the choice', async () => {
    document.documentElement.dataset.theme = 'light';
    render(<ThemeToggle />);
    const button = screen.getByRole('button', { name: 'Đổi giao diện' });
    expect(button).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(button);
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem('coach.theme')).toBe('"dark"');
  });
});
