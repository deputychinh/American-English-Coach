import { render, screen } from '@testing-library/react';

import { ConfidenceBadge } from './ConfidenceBadge';

describe('ConfidenceBadge', () => {
  it('shows a glyph plus the Vietnamese label for each level', () => {
    render(<ConfidenceBadge confidence="high" />);
    expect(screen.getByText('Camera thấy rõ')).toBeInTheDocument();
    expect(screen.getByText('●')).toHaveAttribute('aria-hidden', 'true');
  });

  it('prefers API labels and falls back to low for unknown values', () => {
    render(<ConfidenceBadge confidence="medium" labels={{ medium: 'Một phần' }} />);
    expect(screen.getByText('Một phần')).toBeInTheDocument();
    const { container } = render(<ConfidenceBadge confidence={null} />);
    expect(container.querySelector('.confidence-badge--low')).not.toBeNull();
  });
});
