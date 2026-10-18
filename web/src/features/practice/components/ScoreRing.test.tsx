import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ScoreRing } from '@/features/practice/components/ScoreRing';

describe('ScoreRing', () => {
  it('gives an unsure phone half credit', () => {
    render(<ScoreRing ok={2} check={1} total={3} />);
    expect(screen.getByRole('meter')).toHaveAttribute('aria-valuenow', '83');
  });

  it('counts errors as zero', () => {
    render(<ScoreRing ok={2} total={4} />);
    expect(screen.getByRole('meter')).toHaveAttribute('aria-valuenow', '50');
  });
});
