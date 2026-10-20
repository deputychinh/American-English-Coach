import { render, screen } from '@testing-library/react';

import { THIRD_PARTY_NOTICES } from '@/constants/licenses.constant';

import { LicensesScreen } from './LicensesScreen';

describe('LicensesScreen', () => {
  it('lists every third-party component, the AI voice disclosure and the model NOTICE', () => {
    render(<LicensesScreen />);
    for (const notice of THIRD_PARTY_NOTICES) {
      expect(screen.getByRole('heading', { name: notice.name })).toBeInTheDocument();
    }
    expect(screen.getByText(/OpenAI/)).toBeInTheDocument();
    expect(screen.getByText(/w2v\.mm8\.onnx is derived from/)).toBeInTheDocument();
    expect(screen.getAllByText(/Apache License 2\.0/).length).toBeGreaterThanOrEqual(2);
  });
});
