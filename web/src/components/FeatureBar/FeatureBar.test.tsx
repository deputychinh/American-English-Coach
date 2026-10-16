import { render, screen } from '@testing-library/react';

import { FeatureBar } from './FeatureBar';

describe('FeatureBar', () => {
  it('exposes the value as a meter and says when it is inside the target band', () => {
    render(<FeatureBar label="Độ tròn môi" value={0.7} target={{ min: 0.6 }} />);
    const meter = screen.getByRole('meter', { name: 'Độ tròn môi' });
    expect(meter).toHaveAttribute('aria-valuenow', '70');
    expect(meter).toHaveAttribute('aria-valuetext', '70%, trong vùng mục tiêu');
  });

  it('renders without a target', () => {
    render(<FeatureBar label="Độ mở hàm" value={1.4} />);
    expect(screen.getByRole('meter')).toHaveAttribute('aria-valuetext', '100%');
  });
});
